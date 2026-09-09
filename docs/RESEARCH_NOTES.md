# NAVRASA: Mathematical Foundations & Research Notes

This document details the exact mathematical formulations, algorithmic complexities, assumptions, failure modes, and authoritative academic references for every algorithmic module in NAVRASA.

---

### 1. State Estimation & Multi-Target Tracking

#### 1.1 4D Linear Kalman Filter (Constant Velocity)
* **State Vector**: $\mathbf{x} = [x, y, v_x, v_y]^T \in \mathbb{R}^4$.
* **State Transition**:
  $$\mathbf{x}_{k|k-1} = \mathbf{F} \mathbf{x}_{k-1|k-1}, \quad \mathbf{F} = \begin{bmatrix} 1 & 0 & \Delta t & 0 \\ 0 & 1 & 0 & \Delta t \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}$$
* **Process Covariance**: Continuous white noise acceleration model:
  $$\mathbf{Q} = \sigma_a^2 \begin{bmatrix} \frac{\Delta t^4}{4} & 0 & \frac{\Delta t^3}{2} & 0 \\ 0 & \frac{\Delta t^4}{4} & 0 & \frac{\Delta t^3}{2} \\ \frac{\Delta t^3}{2} & 0 & \Delta t^2 & 0 \\ 0 & \frac{\Delta t^3}{2} & 0 & \Delta t^2 \end{bmatrix}$$
* **Covariance Update (Joseph Form)**:
  $$\mathbf{P}_{k|k} = (\mathbf{I} - \mathbf{K}\mathbf{H})\mathbf{P}_{k|k-1}(\mathbf{I} - \mathbf{K}\mathbf{H})^T + \mathbf{K}\mathbf{R}\mathbf{K}^T$$
* **Complexity**: Time $\mathcal{O}(d^3) = \mathcal{O}(1)$ ($\sim 5\,\mu\text{s}$), Space $\mathcal{O}(d^2) = \mathcal{O}(1)$.
* **Failure Modes**: Degrades during high lateral acceleration maneuvers. Mitigated by switching to CTRV UKF.

#### 1.2 5D Unscented Kalman Filter (CTRV Model)
* **State Vector**: $\mathbf{x} = [x, y, v, \psi, \dot{\psi}]^T \in \mathbb{R}^5$.
* **Kinematic Model**:
  $$\begin{bmatrix} x_{k+1} \\ y_{k+1} \\ v_{k+1} \\ \psi_{k+1} \\ \dot{\psi}_{k+1} \end{bmatrix} = \begin{bmatrix} x_k + \frac{v_k}{\dot{\psi}_k}\left(\sin(\psi_k + \dot{\psi}_k\Delta t) - \sin(\psi_k)\right) \\ y_k + \frac{v_k}{\dot{\psi}_k}\left(-\cos(\psi_k + \dot{\psi}_k\Delta t) + \cos(\psi_k)\right) \\ v_k \\ \psi_k + \dot{\psi}_k\Delta t \\ \dot{\psi}_k \end{bmatrix}$$
* **Sigma Points (Merwe Scaled Transform)**:
  $$\chi_0 = \mathbf{x}, \quad \chi_i = \mathbf{x} + \left[\sqrt{(n + \lambda)\mathbf{P}}\right]_i, \quad \chi_{i+n} = \mathbf{x} - \left[\sqrt{(n + \lambda)\mathbf{P}}\right]_i$$
  with $\alpha = 10^{-3}, \beta = 2.0, \kappa = 0, \lambda = \alpha^2(n + \kappa) - n$.
* **Complexity**: Time $\mathcal{O}(n^3) = \mathcal{O}(1)$ ($\sim 15\,\mu\text{s}$), Space $\mathcal{O}(n^2) = \mathcal{O}(1)$.
* **References**: Julier & Uhlmann, "Unscented Filtering and Nonlinear Estimation", *Proceedings of the IEEE*, 2004.

#### 1.3 Statistical Gating & Hungarian Matching
* **Mahalanobis Gating**:
  $$d_M^2 = (\mathbf{z} - \hat{\mathbf{z}})^T \mathbf{S}^{-1} (\mathbf{z} - \hat{\mathbf{z}}) \le \chi^2_{p, 1-\alpha} \quad (\gamma = 9.21 \text{ for } p=2, \alpha=0.01)$$
* **Bipartite Assignment**: Munkres / Jonker-Volgenant algorithm minimizing total association cost matrix $\mathbf{C} \in \mathbb{R}^{N \times M}$ in $\mathcal{O}(N^3)$.

---

### 2. Road Intent Graph & Relational GNN

* **Graph Representation**: $\mathcal{G} = (\mathcal{V}, \mathcal{E})$ with node attributes $\mathbf{h}_i \in \mathbb{R}^8$ and edge attributes $\mathbf{e}_{ij} \in \mathbb{R}^4$.
* **Relational Graph Attention Layer**:
  $$e_{ij} = \text{LeakyReLU}\left(\mathbf{a}^T \left[ \mathbf{W}_n \mathbf{h}_i \,\|\, \mathbf{W}_n \mathbf{h}_j \,\|\, \mathbf{W}_e \mathbf{e}_{ij} \right]\right)$$
  $$\alpha_{ij} = \frac{\exp(e_{ij})}{\sum_{k \in \mathcal{N}(i)} \exp(e_{ik})}, \quad \mathbf{h}_i' = \text{ELU}\left(\sum_{j \in \mathcal{N}(i)} \alpha_{ij} \mathbf{W}_v \mathbf{h}_j\right)$$
* **Complexity**: Time $\mathcal{O}(|\mathcal{V}| \cdot D + |\mathcal{E}| \cdot D)$, Space $\mathcal{O}(|\mathcal{V}| \cdot D)$.
* **References**: Veličković et al., "Graph Attention Networks", *ICLR*, 2018; Schlichtkrull et al., "Modeling Relational Data with Graph Convolutional Networks", *ESWC*, 2018.

---

### 3. Dynamic 2D Spatial Risk Field

* **Continuous Potential Formulation**:
  $$\mathcal{R}(x, y, t) = w_{ttc} \mathcal{R}_{ttc}(x, y) + w_{kin} \mathcal{R}_{kin}(x, y) + w_{unc} \mathcal{R}_{unc}(x, y) + w_{occ} \mathcal{R}_{occ}(x, y)$$
* **Kinetic Potential**:
  $$\mathcal{R}_{kin}(x,y) = \frac{1}{2} m v^2 \exp\left( -\frac{1}{2} \left[ \left(\frac{d_{lon}}{\sigma_{lon}(v)}\right)^2 + \left(\frac{d_{lat}}{\sigma_{lat}}\right)^2 \right] \right)$$
* **Complexity**: Time $\mathcal{O}(W \times H \times N_{actors})$ ($\sim 8\,\text{ms}$ vectorized via NumPy).
* **References**: Wolf & Burdick, "Artificial Potential Field for Mobile Robot Navigation", *IEEE TRO*, 2008; Kolekar et al., "Driver Behavior and Risk Fields", *IEEE T-ITS*, 2020.

---

### 4. Hierarchical Motion Planning & Spline Optimization

#### 4.1 Kinodynamic Hybrid A* in SE(2)
* **Search Space**: Continuous $(x, y, \theta) \in SE(2)$ with 3D bucket resolution $(\Delta x, \Delta y, \Delta \theta) = (0.5\text{m}, 0.5\text{m}, 15^\circ)$.
* **Motion Primitives**: Bicycle model steering inputs $\delta \in [-\delta_{max}, \dots, +\delta_{max}]$ with forward ($+1$) and reverse ($-1$) gear primitives.
* **Dual Heuristics**:
  $$h(x, y, \theta) = \max\left( h_{nonholonomic}(x, y, \theta), h_{2D,risk}(x, y) \right)$$
* **Analytical Expansion**: Periodically tests Reeds-Shepp / Dubins direct curves with SAT polygon collision and risk threshold verification.
* **Complexity**: Time $\mathcal{O}(N_{nodes} \log N_{nodes})$ ($\sim 15-30\,\text{ms}$).
* **References**: Dolgov et al., "Path Planning for Autonomous Vehicles in Unknown Semi-structured Environments", *IJRR*, 2010.

#### 4.2 Quintic Polynomial Splines
* **Parametric Formulation**: $p(t) = a_0 + a_1 t + a_2 t^2 + a_3 t^3 + a_4 t^4 + a_5 t^5$.
* **Boundary Matching**: Matches $(p_0, v_0, a_0)$ at $t=0$ and $(p_1, v_1, a_1)$ at $t=T$ via exact $3\times 3$ linear matrix inversion.
* **Objective**: Minimizes total integrated lateral & longitudinal jerk:
  $$\min \int_0^T \left( (\dddot{x}(t))^2 + (\dddot{y}(t))^2 \right) dt$$
* **Complexity**: Closed-form analytical $\mathcal{O}(1)$ ($\sim 20\,\mu\text{s}$).
* **References**: Werling et al., "Optimal Trajectory Generation for Dynamic Street Scenarios in Frenét Frames", *IEEE ICRA*, 2010.

---

### 5. Safety-Critical Control (MPC + CBF)

#### 5.1 Constrained Model Predictive Control
* **Quadratic Program**:
  $$\min_{\mathbf{U}} \sum_{k=0}^{N-1} \left( \|\mathbf{x}_k - \mathbf{x}_{ref,k}\|_{\mathbf{Q}}^2 + \|\mathbf{u}_k\|_{\mathbf{R}}^2 + \|\Delta \mathbf{u}_k\|_{\mathbf{R}_d}^2 \right) + \|\mathbf{x}_N - \mathbf{x}_{ref,N}\|_{\mathbf{Q}_f}^2$$
  subject to vehicle kinematic bicycle dynamics, speed limits $v \in [0, v_{max}]$, acceleration $a \in [a_{min}, a_{max}]$, and steering limits $|\delta| \le \delta_{max}, |\Delta \delta| \le \dot{\delta}_{max}\Delta t$.

#### 5.2 Control Barrier Function (CBF-QP) Shield
* **Safe Set $\mathcal{C}$**: $\mathcal{C} = \{\mathbf{x} \in \mathcal{X} \mid h_i(\mathbf{x}) \ge 0\}$.
* **Kinetic Braking Barrier**:
  $$h_i(\mathbf{x}) = \|\mathbf{p}_{ego} - \mathbf{p}_{obs,i}\|^2 - \left( d_{safe} + \frac{v^2}{2 |a_{decel,max}|} \right)^2$$
* **Forward Invariance Condition**:
  $$\dot{h}_i(\mathbf{x}, \mathbf{u}) + \gamma h_i(\mathbf{x}) \ge 0$$
* **CBF-QP Filter**:
  $$\min_{\mathbf{u}, \epsilon} \frac{1}{2} \|\mathbf{u} - \mathbf{u}_{nom}\|_{\mathbf{W}}^2 + \frac{1}{2} w_\epsilon \epsilon^2 \quad \text{s.t.} \quad L_f h_i + L_g h_i \mathbf{u} + \gamma h_i + \epsilon \ge 0$$
* **Safety Guarantee**: Forward invariance of $\mathcal{C}$ is mathematically guaranteed independent of the nominal MPC policy.
* **References**: Ames et al., "Control Barrier Functions: Theory and Applications", *IEEE ECC*, 2019; Ames et al., "Control Barrier Function Based Quadratic Programs with Application to Adaptive Cruise Control", *IEEE TAC*, 2017.
