"use client";
/** If a WebGL scene throws (context creation failed, shader error), render the 2D fallback instead. */
import { Component, type ReactNode } from "react";

export default class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onFail?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
