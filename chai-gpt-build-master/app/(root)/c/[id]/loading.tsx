import { Loader } from "@/components/ai-elements/loader";

export default function ConversationLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader size={24} />
    </div>
  );
}
