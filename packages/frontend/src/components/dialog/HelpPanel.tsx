import React from "react";
import { Server, MessageCircle, FileText, Settings, Sparkles, Info, FilePlus2, FileImage, } from "lucide-react";

const SUPPORTED_DOCS = [
  "pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"
];
const SUPPORTED_IMAGES = [
  "png", "jpeg", "jpg", "gif", "webp"
];

const HelpPanel: React.FC = () => {
  return (
    <div className="space-y-6 text-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-6 w-6 text-indigo-400" />
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400">MCP 시스템 도움말</h2>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/60 shadow-lg space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Server className="h-5 w-5 text-indigo-300" />
          <span className="font-semibold text-indigo-200">MCP Server & 도구 호출</span>
        </div>
        <p className="text-sm text-gray-300 mb-2">
          MCP Server를 추가하여 다양한 외부 도구를 MCP 기반으로 실시간 호출하고, AI 응답에 활용할 수 있습니다.<br />
          <span className="text-indigo-400 font-medium">MCP Tool</span>은 JSON 형식으로 등록/삭제할 수 있습니다.
        </p>
        <ul className="list-disc pl-6 text-sm text-gray-400 space-y-1">
          <li>좌측 메뉴에서 <span className="font-semibold text-indigo-300">MCP 도구</span>를 추가/삭제할 수 있습니다.</li>
          <li>도구는 <span className="font-mono bg-gray-800 px-1 rounded">config.json</span>에 저장됩니다.</li>
          <li>도구 호출 결과는 채팅 응답에 실시간 반영됩니다.</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/60 shadow-lg space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-purple-300" />
          <span className="font-semibold text-purple-200">시스템 프롬프트</span>
        </div>
        <p className="text-sm text-gray-300 mb-2">
          시스템 프롬프트를 <span className="font-mono bg-gray-800 px-1 rounded">YAML</span> 형식으로 자유롭게 변경할 수 있습니다.<br />
          프롬프트를 수정하면 에이전트의 응답 스타일과 동작 방식을 즉시 바꿀 수 있습니다.
        </p>
        <ul className="list-disc pl-6 text-sm text-gray-400 space-y-1">
          <li>프롬프트는 <span className="font-mono bg-gray-800 px-1 rounded">system_prompt.yaml</span>에 저장됩니다.</li>
          <li>변경 후 <span className="font-semibold text-indigo-300">저장 및 에이전트 재시작</span>을 통해 즉시 반영됩니다.</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/60 shadow-lg space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FilePlus2 className="h-5 w-5 text-green-300" />
          <span className="font-semibold text-green-200">첨부파일 지원</span>
        </div>
        <p className="text-sm text-gray-300 mb-2">
          채팅 입력 시 이미지 및 문서 파일을 첨부할 수 있습니다.<br />
          현재 지원되는 파일 형식은 아래와 같습니다.
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-900/40 text-indigo-200 text-xs">
            <FileText className="h-4 w-4" />
            {SUPPORTED_DOCS.join(", ")}
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-900/40 text-purple-200 text-xs">
            <FileImage className="h-4 w-4" />
            {SUPPORTED_IMAGES.join(", ")}
          </div>
        </div>
        <ul className="list-disc pl-6 text-sm text-gray-400 space-y-1">
          <li>첨부파일은 채팅 입력창 우측의 <span className="font-semibold text-indigo-300">클립 아이콘</span>을 통해 추가할 수 있습니다.</li>
          <li>첨부파일은 AI 응답에 직접 활용됩니다.</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/60 shadow-lg space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="h-5 w-5 text-yellow-300" />
          <span className="font-semibold text-yellow-200">채팅 및 이력</span>
        </div>
        <p className="text-sm text-gray-300 mb-2">
          채팅 인터페이스는 실시간 스트리밍 응답을 지원합니다.<br />
          <span className="text-yellow-400 font-medium">현재는 채팅 이력(대화 저장/불러오기)은 지원되지 않습니다.</span>
        </p>
        <ul className="list-disc pl-6 text-sm text-gray-400 space-y-1">
          <li>모든 대화는 메모리 기반으로만 관리됩니다.</li>
          <li>새 대화 시작 시 이전 내용은 초기화됩니다.</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/60 shadow-lg space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-pink-300" />
          <span className="font-semibold text-pink-200">기타 안내</span>
        </div>
        <ul className="list-disc pl-6 text-sm text-gray-400 space-y-1">
          <li>Claude, Amazon Nova 등 다양한 Bedrock 기반 모델을 선택할 수 있습니다.</li>
          <li>모든 설정은 로컬에 저장되며, 로그인/회원가입 기능은 지원하지 않습니다.</li>
          <li>배포는 지원하지 않으며, 로컬 환경에서만 동작합니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default HelpPanel; 