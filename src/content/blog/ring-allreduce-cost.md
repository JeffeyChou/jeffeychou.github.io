---
title: "Ring Allreduce, from the α–β model up"
date: 2026-10-30
summary: "Why the ring is bandwidth-optimal, where its latency term hurts, and what compression changes in the cost model."
tags: ["collectives", "mpi", "notes"]
---

These are study notes on the classic cost model for Allreduce. They are the starting point for asking what a compressor *buys* inside a collective.

## The model

A message of $n$ bytes between two ranks costs

$$
T(n) = \alpha + n\beta,
$$

where $\alpha$ is the per-message latency and $\beta$ the inverse bandwidth. Reductions also pay $\gamma$ per byte of local arithmetic.

## Ring Allreduce

With $p$ ranks, the ring runs a **reduce-scatter** followed by an **allgather**, each taking $p-1$ steps on chunks of size $n/p$:

$$
T_{\text{ring}} = 2(p-1)\,\alpha \;+\; 2\,\frac{p-1}{p}\,n\beta \;+\; \frac{p-1}{p}\,n\gamma .
$$

The bandwidth term approaches $2n\beta$, which matches the lower bound: every rank must send and receive at least $\frac{p-1}{p}n$ bytes in each phase. The latency term, however, grows linearly in $p$, so small messages at scale prefer trees or recursive doubling.

## Where compression enters

If a compressor shrinks data by a ratio $r$ at throughput $\theta$, a *decompress–operate–compress* step pays roughly $\frac{n}{p}\left(\frac{2}{\theta} + \frac{1}{\theta}\right)$ per hop, while a homomorphic scheme reduces directly on compressed data:

$$
T_{\text{homo}} \approx 2(p-1)\,\alpha + 2\,\frac{p-1}{p}\,\frac{n}{r}\,\beta + \frac{p-1}{p}\,\frac{n}{r}\,\gamma_c ,
$$

with $\gamma_c$ the cost of the compressed-domain reduction. The win requires $r$ to be large *and* $\gamma_c$ small, which is the whole design problem.

## A reduction step on the GPU

The local reduce in each step is a streaming kernel; the interesting part is keeping it bandwidth-bound:

```cuda
__global__ void reduce_add(const float4* __restrict__ a,
                           const float4* __restrict__ b,
                           float4* __restrict__ out, size_t n4) {
  for (size_t i = blockIdx.x * blockDim.x + threadIdx.x; i < n4;
       i += (size_t)gridDim.x * blockDim.x) {
    float4 x = a[i], y = b[i];
    out[i] = make_float4(x.x + y.x, x.y + y.y, x.z + y.z, x.w + y.w);
  }
}
```

> Rule of thumb: once $n/p$ drops below roughly $\alpha/\beta$, the latency term dominates and the ring is the wrong algorithm, compressed or not.
