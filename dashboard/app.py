"""
NAVRASA Mission Control Dashboard.
Research-Grade Autonomous Driving Operations Center for Unstructured Indian Roads.

Built with Streamlit and Plotly for SIH 2026.
"""

from __future__ import annotations
import time
import streamlit as st
import numpy as np
import plotly.graph_objects as go

from backend.core.types import FrameBundle
from backend.engine import NavrasaAutonomyEngine
from simulation.scenarios import load_all_scenarios
from dashboard.components.bev_canvas import render_bev_canvas
from dashboard.components.graph_view import render_intent_graph_view
from dashboard.telemetry import render_latency_breakdown_chart, render_safety_margin_gauge

# Page Configuration
st.set_page_config(
    page_title="NAVRASA | Mission Control Station",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom High-Tech Styling
st.markdown("""
<style>
    .stApp {
        background-color: #0b0e17;
        color: #e2e8f0;
        font-family: 'Inter', -apple-system, sans-serif;
    }
    .metric-card {
        background: linear-gradient(135deg, rgba(20, 26, 43, 0.8) 0%, rgba(10, 14, 26, 0.8) 100%);
        border: 1px solid #1e293b;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
    .cbf-alert-active {
        background-color: rgba(239, 68, 68, 0.2);
        border: 1px solid #ef4444;
        color: #fca5a5;
        padding: 8px 12px;
        border-radius: 6px;
        font-weight: 600;
    }
    .cbf-alert-nominal {
        background-color: rgba(16, 185, 129, 0.15);
        border: 1px solid #10b981;
        color: #6ee7b7;
        padding: 8px 12px;
        border-radius: 6px;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)


# Initialize Autonomy Engine in session state
if "engine" not in st.session_state:
    st.session_state.engine = NavrasaAutonomyEngine()
    st.session_state.current_scenario_id = "autorickshaw_cutin_blindspot"
    st.session_state.engine.load_scenario(st.session_state.current_scenario_id)
    st.session_state.is_running = False
    st.session_state.latest_bundle = st.session_state.engine.step(dt=0.05)

engine: NavrasaAutonomyEngine = st.session_state.engine
scenarios = load_all_scenarios()
scenario_options = {s["name"]: s["id"] for s in scenarios}


# Top Navigation & Header Control Bar
st.markdown("## 🛰️ NAVRASA Autonomous Systems Engineering Station")
st.caption("Neural Adaptive Vehicular Reasoning with Anticipatory Scene Awareness — Research Autonomy for Unstructured Indian Roads")

ctrl_col1, ctrl_col2, ctrl_col3, ctrl_col4, ctrl_col5 = st.columns([3, 1, 1, 1.5, 1.5])

with ctrl_col1:
    selected_name = st.selectbox(
        "Benchmark Scenario",
        options=list(scenario_options.keys()),
        index=0,
        label_visibility="collapsed"
    )
    selected_id = scenario_options[selected_name]
    if selected_id != st.session_state.current_scenario_id:
        st.session_state.current_scenario_id = selected_id
        engine.load_scenario(selected_id)
        st.session_state.latest_bundle = engine.step(dt=0.05)
        st.rerun()

with ctrl_col2:
    if st.button("▶ Step 1 Frame", use_container_width=True):
        st.session_state.latest_bundle = engine.step(dt=0.05)
        st.rerun()

with ctrl_col3:
    if st.button("🔄 Reset Run", use_container_width=True):
        engine.load_scenario(st.session_state.current_scenario_id)
        st.session_state.latest_bundle = engine.step(dt=0.05)
        st.rerun()

bundle: FrameBundle = st.session_state.latest_bundle

with ctrl_col4:
    if bundle.control_command and bundle.control_command.cbf_active:
        st.markdown("<div class='cbf-alert-active'>⚠️ CBF INTERVENTION ACTIVE</div>", unsafe_allow_html=True)
    else:
        st.markdown("<div class='cbf-alert-nominal'>🛡️ CBF BARRIER NOMINAL</div>", unsafe_allow_html=True)

with ctrl_col5:
    st.markdown(f"**FPS:** {bundle.metrics.fps:.1f} | **Latency:** {bundle.metrics.total_pipeline_latency_ms:.1f}ms")


# Telemetry Quick Metric Bar
m_col1, m_col2, m_col3, m_col4, m_col5, m_col6 = st.columns(6)
with m_col1:
    st.metric("Sim Time", f"{bundle.timestamp:.2f} s")
with m_col2:
    st.metric("Ego Speed", f"{bundle.ego_state.speed * 3.6:.1f} km/h")
with m_col3:
    st.metric("Steering Angle", f"{math.degrees(bundle.control_command.steering_angle if bundle.control_command else 0.0):.1f}°")
with m_col4:
    st.metric("Acceleration", f"{bundle.control_command.acceleration if bundle.control_command else 0.0:.2f} m/s²")
with m_col5:
    st.metric("Active Tracks", f"{len(bundle.tracks)}")
with m_col6:
    st.metric("CBF Invocations", f"{bundle.metrics.cbf_interventions_total}")

st.divider()

# Main Visual Canvas Layout
left_col, right_col = st.columns([1.6, 1.0])

with left_col:
    st.subheader("🗺️ Birds-Eye-View (BEV) World Canvas & Risk Overlay")
    bev_fig = render_bev_canvas(bundle)
    st.plotly_chart(bev_fig, use_container_width=True)

    # Explainability Narrative Log
    st.subheader("🧠 Decision Timeline & Reasoning Explainability")
    st.info(f"**Frame #{bundle.frame_id} [t={bundle.timestamp:.2f}s]:** {bundle.decision_narrative}")

with right_col:
    tab1, tab2, tab3 = st.tabs(["🕸️ Intent Graph", "🔮 Future Composer", "⚡ Telemetry & Health"])

    with tab1:
        st.markdown("#### Dynamic Road Intent Graph (RIG)")
        rig_fig = render_intent_graph_view(bundle.intent_graph)
        st.plotly_chart(rig_fig, use_container_width=True)

        if bundle.intent_graph.edges:
            st.markdown("##### Active Relational Edges:")
            for e in bundle.intent_graph.edges[:4]:
                ttc_str = f"{e.time_to_collision:.1f}s" if e.time_to_collision else "N/A"
                st.write(f"- **{e.source_id} → {e.target_id}**: `{e.edge_type.value}` (Weight: {e.weight:.2f}, TTC: {ttc_str}, Attention: {e.attention_weight:.3f})")

    with tab2:
        st.markdown("#### Multi-Modal Future Predictions (Top-K)")
        if bundle.predictions.predictions:
            for aid, pred in bundle.predictions.predictions.items():
                st.markdown(f"**Actor:** `{aid}` ({pred.actor_type.value})")
                for hyp in pred.hypotheses:
                    st.progress(hyp.probability, text=f"{hyp.maneuver_name}: {hyp.probability*100:.1f}%")
        else:
            st.write("No active dynamic actors in prediction range.")

    with tab3:
        st.markdown("#### Pipeline Latency Breakdown")
        latency_fig = render_latency_breakdown_chart(bundle.metrics)
        st.plotly_chart(latency_fig, use_container_width=True)

        st.markdown("#### Safety Barrier Margin")
        cbf_fig = render_safety_margin_gauge(bundle.control_command)
        st.plotly_chart(cbf_fig, use_container_width=True)
