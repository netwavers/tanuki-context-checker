from abc import ABC, abstractmethod
from typing import Dict
from tanuki_checker.ast import DocumentAST
from tanuki_checker.symbol import SymbolTable


class PassExecutionError(Exception):
    """Exception raised when an error occurs during pass execution."""
    pass


class IAnalysisPass(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Passの識別名称"""
        pass

    @abstractmethod
    def execute(self, ast: DocumentAST, sym_table: SymbolTable) -> Dict[str, float]:
        """
        ASTおよびSymbolTableを受け取り、各層の解析メトリクスDictを返す。
        例外は捕捉され、PassExecutionErrorにラップされること。
        """
        pass
