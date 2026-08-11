"""
Analysis Passes package for Tanuki Context Checker.
"""

from tanuki_checker.passes.base import IAnalysisPass, PassExecutionError
from tanuki_checker.passes.symbol import SymbolPass
from tanuki_checker.passes.flow import FlowPass
from tanuki_checker.passes.surface import SurfacePass
from tanuki_checker.passes.lexical import LexicalPass
from tanuki_checker.passes.structural import StructuralPass

__all__ = [
    "IAnalysisPass",
    "PassExecutionError",
    "SymbolPass",
    "FlowPass",
    "SurfacePass",
    "LexicalPass",
    "StructuralPass",
]

