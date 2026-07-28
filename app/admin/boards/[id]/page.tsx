import { BoardView } from "@/components/boards/BoardView";

export default async function AdminBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardView boardId={id} basePath="/admin/boards" />;
}
