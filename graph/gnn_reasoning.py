"""
NAVRASA Relational Graph Neural Network (RGAT) for Intent & Negotiation Reasoning.

Mathematical Foundation:
------------------------
Computes multi-head relational attention over dynamic Road Intent Graph edges:
  e_{ij} = LeakyReLU( a^T [ W_n * h_i || W_n * h_j || W_e * edge_attr_{ij} ] )
  alpha_{ij} = softmax_j ( e_{ij} )
  h_i' = ELU( sum_{j in N(i)} alpha_{ij} * W_v * h_j )

Output:
  - Interaction embeddings Z in R^{N x D_out}
  - Updated edge attention weights alpha in [0, 1]
  - Predicted Yield / Right-of-Way negotiation probabilities in [0, 1]
"""

from __future__ import annotations
import math
from typing import Dict, List, Tuple, Optional
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from backend.core.types import (
    RoadIntentGraphState,
    IntentNode,
    IntentEdge,
    IntentEdgeType
)


class RelationalGraphAttentionLayer(nn.Module):
    """Multi-Head Relational Graph Attention Layer for spatial-temporal scene graphs."""

    def __init__(
        self,
        in_node_features: int = 8,
        in_edge_features: int = 4,
        out_features: int = 32,
        num_heads: int = 4
    ):
        super().__init__()
        self.in_node_features = in_node_features
        self.in_edge_features = in_edge_features
        self.out_features = out_features
        self.num_heads = num_heads
        self.head_dim = out_features // num_heads

        self.W_node = nn.Linear(in_node_features, out_features, bias=False)
        self.W_edge = nn.Linear(in_edge_features, out_features, bias=False)
        self.W_value = nn.Linear(in_node_features, out_features, bias=False)

        # Attention vector: [head_dim + head_dim + head_dim] -> 1
        self.attn_vec = nn.Parameter(torch.Tensor(num_heads, 3 * self.head_dim))
        nn.init.xavier_uniform_(self.attn_vec.unsqueeze(0))

        self.leaky_relu = nn.LeakyReLU(0.2)
        self.out_proj = nn.Linear(out_features, out_features)

    def forward(
        self,
        node_feats: torch.Tensor,
        edge_index: torch.Tensor,
        edge_feats: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            node_feats: Tensor of shape (N, in_node_features)
            edge_index: LongTensor of shape (2, M) [source_nodes, target_nodes]
            edge_feats: Tensor of shape (M, in_edge_features)

        Returns:
            updated_node_feats: (N, out_features)
            attention_weights: (M,)
        """
        N = node_feats.size(0)
        M = edge_index.size(1)

        if M == 0 or N == 0:
            return self.out_proj(self.W_node(node_feats)), torch.zeros(M, device=node_feats.device)

        # Project features
        h_node = self.W_node(node_feats).view(N, self.num_heads, self.head_dim)
        h_val = self.W_value(node_feats).view(N, self.num_heads, self.head_dim)
        h_edge = self.W_edge(edge_feats).view(M, self.num_heads, self.head_dim)

        src, dst = edge_index[0], edge_index[1]

        # Gather node features for edges
        h_src = h_node[src]  # (M, num_heads, head_dim)
        h_dst = h_node[dst]  # (M, num_heads, head_dim)

        # Concatenate [h_src || h_dst || h_edge]
        cat_feats = torch.cat([h_src, h_dst, h_edge], dim=-1)  # (M, num_heads, 3*head_dim)

        # Compute raw attention scores
        # einsum: (M, H, 3*D) * (H, 3*D) -> (M, H)
        attn_scores = (cat_feats * self.attn_vec.unsqueeze(0)).sum(dim=-1)
        attn_scores = self.leaky_relu(attn_scores)

        # Softmax over incoming edges per target node dst
        # Numerically stable exp
        exp_scores = torch.exp(attn_scores - attn_scores.max(dim=0, keepdim=True)[0])
        denom = torch.zeros(N, self.num_heads, device=node_feats.device)
        denom.index_add_(0, dst, exp_scores)
        denom = denom + 1e-8

        alpha = exp_scores / denom[dst]  # (M, num_heads)

        # Aggregate weighted values
        weighted_val = alpha.unsqueeze(-1) * h_val[src]  # (M, num_heads, head_dim)
        out_agg = torch.zeros(N, self.num_heads, self.head_dim, device=node_feats.device)
        out_agg.index_add_(0, dst, weighted_val)

        out_flat = out_agg.view(N, self.out_features)
        out_node = F.elu(self.out_proj(out_flat))
        mean_attn = alpha.mean(dim=-1)  # (M,)

        return out_node, mean_attn


class IntentGNNReasoner(nn.Module):
    """Complete Neural Relational Intent & Negotiation Reasoning Module."""

    def __init__(self, node_dim: int = 8, edge_dim: int = 4, hidden_dim: int = 64):
        super().__init__()
        self.rgat1 = RelationalGraphAttentionLayer(node_dim, edge_dim, hidden_dim, num_heads=4)
        self.rgat2 = RelationalGraphAttentionLayer(hidden_dim, edge_dim, hidden_dim, num_heads=4)

        # Yield probability classification head
        self.yield_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

        # Negotiation assertiveness / intention score
        self.assertiveness_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(
        self,
        node_feats: torch.Tensor,
        edge_index: torch.Tensor,
        edge_feats: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Returns:
            (node_embeddings, attention_weights, yield_probs, assertiveness_scores)
        """
        h1, attn1 = self.rgat1(node_feats, edge_index, edge_feats)
        h2, attn2 = self.rgat2(h1, edge_index, edge_feats)

        yield_probs = self.yield_head(h2).squeeze(-1)
        assert_scores = self.assertiveness_head(h2).squeeze(-1)

        return h2, attn2, yield_probs, assert_scores

    def reason_over_graph(self, graph_state: RoadIntentGraphState) -> RoadIntentGraphState:
        """
        Executes GNN inference over a dynamic RoadIntentGraphState and returns updated state with attention.
        """
        node_ids = list(graph_state.nodes.keys())
        node_to_idx = {nid: i for i, nid in enumerate(node_ids)}
        N = len(node_ids)

        if N == 0:
            return graph_state

        # Build node tensor
        node_mat = np.array([graph_state.nodes[nid].features for nid in node_ids], dtype=np.float32)
        node_tensor = torch.from_numpy(node_mat)

        # Build edge tensors
        edge_type_map = {
            IntentEdgeType.PROXIMITY: 0,
            IntentEdgeType.FOLLOWING: 1,
            IntentEdgeType.CROSSING: 2,
            IntentEdgeType.MERGING: 3,
            IntentEdgeType.OVERTAKING: 4,
            IntentEdgeType.LATERAL_ENCROACHMENT: 5,
            IntentEdgeType.YIELD_NEGOTIATION: 6,
            IntentEdgeType.OCCLUDING: 7,
            IntentEdgeType.CONFLICT: 8
        }

        src_list = []
        dst_list = []
        edge_attr_list = []

        for e in graph_state.edges:
            if e.source_id in node_to_idx and e.target_id in node_to_idx:
                src_list.append(node_to_idx[e.source_id])
                dst_list.append(node_to_idx[e.target_id])
                ttc_val = e.time_to_collision if e.time_to_collision is not None else 10.0
                edge_attr_list.append([
                    e.weight,
                    min(e.spatial_distance / 25.0, 1.0),
                    min(ttc_val / 10.0, 1.0),
                    float(edge_type_map.get(e.edge_type, 0)) / 8.0
                ])

        if len(src_list) > 0:
            edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)
            edge_attr = torch.tensor(edge_attr_list, dtype=torch.float32)
        else:
            edge_index = torch.zeros((2, 0), dtype=torch.long)
            edge_attr = torch.zeros((0, 4), dtype=torch.float32)

        with torch.no_grad():
            embeddings, attns, yield_p, assert_s = self.forward(node_tensor, edge_index, edge_attr)

        # Update node priority and uncertainty
        yield_np = yield_p.numpy()
        assert_np = assert_s.numpy()
        for idx, nid in enumerate(node_ids):
            graph_state.nodes[nid].priority_score = float(assert_np[idx])

        # Update edge attention weights
        if len(graph_state.edges) > 0 and len(attns) > 0:
            attn_np = attns.numpy()
            for idx, e in enumerate(graph_state.edges):
                if idx < len(attn_np):
                    e.attention_weight = float(attn_np[idx])

        return graph_state
