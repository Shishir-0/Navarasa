"""
NAVRASA Dynamic Road Intent Graph (RIG) Builder.

Maintains an attributed directed NetworkX graph representing spatial,
temporal, and behavioral relationships between Ego and all surrounding road agents.
"""

from __future__ import annotations
import math
from typing import Dict, List, Optional, Tuple
import networkx as nx
import numpy as np

from backend.core.types import (
    ActorType,
    ActorState,
    TrackState,
    IntentNode,
    IntentNodeType,
    IntentEdge,
    IntentEdgeType,
    RoadIntentGraphState,
    Vector2D
)
from backend.core.config import GraphConfig
from graph.spatial_relations import classify_spatial_relation


class RoadIntentGraph:
    """Dynamic relational scene graph constructed per frame."""

    def __init__(self, config: Optional[GraphConfig] = None):
        self.config = config or GraphConfig()
        self.graph = nx.DiGraph()

    def build_graph(
        self,
        ego_state: ActorState,
        tracks: List[TrackState],
        timestamp: float = 0.0
    ) -> RoadIntentGraphState:
        """
        Constructs the dynamic Road Intent Graph for the current frame.
        """
        self.graph.clear()
        nodes_dict: Dict[str, IntentNode] = {}
        edges_list: List[IntentEdge] = []
        conflict_hotspots: List[Vector2D] = []

        # 1. Add Ego Node
        ego_feature = [
            ego_state.position.x,
            ego_state.position.y,
            ego_state.velocity.x,
            ego_state.velocity.y,
            ego_state.speed,
            ego_state.heading,
            0.5,  # Ego baseline priority
            0.05  # Ego low uncertainty
        ]
        ego_node = IntentNode(
            node_id="ego",
            node_type=IntentNodeType.EGO,
            actor_type=ActorType.EGO,
            position=ego_state.position,
            velocity=ego_state.velocity,
            heading=ego_state.heading,
            speed=ego_state.speed,
            priority_score=0.5,
            uncertainty=0.05,
            features=ego_feature
        )
        nodes_dict["ego"] = ego_node
        self.graph.add_node("ego", data=ego_node)

        # 2. Add Track Nodes
        all_participants = [("ego", ego_node)]

        for t in tracks:
            # Determine priority score based on actor type heuristics (Indian traffic norms)
            priority_map = {
                ActorType.BUS: 0.85,
                ActorType.TRUCK: 0.80,
                ActorType.AUTORICKSHAW: 0.65,
                ActorType.CAR: 0.50,
                ActorType.TWO_WHEELER: 0.45,
                ActorType.PEDESTRIAN: 0.90,  # Safety priority for VRU
                ActorType.CATTLE: 0.95       # Absolute yielding priority for cattle
            }
            p_score = priority_map.get(t.actor_type, 0.5)

            # Node Type
            ntype = IntentNodeType.VULNERABLE_ROAD_USER if t.actor_type in (ActorType.PEDESTRIAN, ActorType.CATTLE, ActorType.TWO_WHEELER) else IntentNodeType.DYNAMIC_ACTOR

            feat = [
                t.position.x,
                t.position.y,
                t.velocity.x,
                t.velocity.y,
                t.speed,
                t.heading,
                p_score,
                0.15
            ]
            node = IntentNode(
                node_id=t.track_id,
                node_type=ntype,
                actor_type=t.actor_type,
                position=t.position,
                velocity=t.velocity,
                heading=t.heading,
                speed=t.speed,
                priority_score=p_score,
                uncertainty=0.15,
                features=feat
            )
            nodes_dict[t.track_id] = node
            self.graph.add_node(t.track_id, data=node)
            all_participants.append((t.track_id, node))

        # 3. Compute Inter-Actor Relational Edges
        num_p = len(all_participants)
        for i in range(num_p):
            id_i, node_i = all_participants[i]
            pos_i = (node_i.position.x, node_i.position.y)
            vel_i = (node_i.velocity.x, node_i.velocity.y)

            for j in range(num_p):
                if i == j:
                    continue
                id_j, node_j = all_participants[j]
                pos_j = (node_j.position.x, node_j.position.y)
                vel_j = (node_j.velocity.x, node_j.velocity.y)

                dist = math.hypot(pos_j[0] - pos_i[0], pos_j[1] - pos_i[1])
                if dist > self.config.spatial_proximity_radius:
                    continue

                edge_type, weight, ttc = classify_spatial_relation(
                    pos_i=pos_i,
                    vel_i=vel_i,
                    heading_i=node_i.heading,
                    pos_j=pos_j,
                    vel_j=vel_j,
                    heading_j=node_j.heading,
                    proximity_thresh=self.config.spatial_proximity_radius,
                    ttc_critical=self.config.critical_ttc_threshold
                )

                rel_vel = math.hypot(vel_j[0] - vel_i[0], vel_j[1] - vel_i[1])
                edge = IntentEdge(
                    source_id=id_i,
                    target_id=id_j,
                    edge_type=edge_type,
                    weight=weight,
                    spatial_distance=dist,
                    time_to_collision=ttc,
                    relative_velocity=rel_vel,
                    attention_weight=weight
                )
                edges_list.append(edge)
                self.graph.add_edge(id_i, id_j, data=edge)

                # Record conflict hotspot
                if edge_type == IntentEdgeType.CONFLICT:
                    mid_x = (pos_i[0] + pos_j[0]) / 2.0
                    mid_y = (pos_i[1] + pos_j[1]) / 2.0
                    conflict_hotspots.append(Vector2D(x=mid_x, y=mid_y))

        return RoadIntentGraphState(
            timestamp=timestamp,
            nodes=nodes_dict,
            edges=edges_list,
            conflict_hotspots=conflict_hotspots
        )
