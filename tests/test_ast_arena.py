import unittest
from tanuki_checker.ast import DocumentAST, NodeType, TokenTag, StringSlice


class TestASTArenaAllocation(unittest.TestCase):
    def test_arena_vector_allocation(self):
        ast = DocumentAST(doc_id="test_doc")
        root = ast.add_node(
            node_type=NodeType.DOCUMENT,
            slice_range=StringSlice(start_char=0, end_char=50),
            raw_text="Test document text",
            depth=0,
        )
        self.assertEqual(root.node_id, 0)
        self.assertEqual(len(ast.nodes), 1)

        para = ast.add_node(
            node_type=NodeType.PARAGRAPH,
            slice_range=StringSlice(start_char=0, end_char=25),
            raw_text="Test paragraph",
            parent_id=root.node_id,
            depth=1,
        )
        self.assertEqual(para.node_id, 1)
        self.assertEqual(root.child_ids, [1])

        sentence = ast.add_node(
            node_type=NodeType.SENTENCE,
            slice_range=StringSlice(start_char=0, end_char=10),
            raw_text="Test",
            parent_id=para.node_id,
            depth=2,
        )
        self.assertEqual(sentence.node_id, 2)
        self.assertEqual(para.child_ids, [2])

    def test_get_nodes_by_type(self):
        ast = DocumentAST(doc_id="test_doc")
        ast.add_node(NodeType.DOCUMENT, StringSlice(start_char=0, end_char=10), "Root", depth=0)
        ast.add_node(NodeType.PARAGRAPH, StringSlice(start_char=0, end_char=5), "P1", depth=1)
        ast.add_node(NodeType.PARAGRAPH, StringSlice(start_char=5, end_char=10), "P2", depth=1)

        paragraphs = ast.get_nodes_by_type(NodeType.PARAGRAPH)
        self.assertEqual(len(paragraphs), 2)


if __name__ == "__main__":
    unittest.main()
