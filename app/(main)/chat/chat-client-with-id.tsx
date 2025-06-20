"use client";

import type React from "react";
import { useChat } from "@ai-sdk/react";
import {
  Fragment,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import MessageBar from "@/components/message-bar";
import TooltipContainer from "@/components/tooltip-container";
import { useGlobalstate } from "@/context/global-store";
import type { ChatClientPropsPartial } from "@/lib/type";
import { models, ModelSwitcher } from "@/components/models";
import { motion, MotionConfig } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { convertToUIMessages } from "@/lib/convert-to-uimessages";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { searchTools } from "@/lib/chat-tools";
import { useDirection } from "@/hooks/use-direction";
import { useFileUpload } from "@/hooks/use-file-upload";
import PreviewImg from "@/components/preview-img";
import { useFileToBase64 } from "@/hooks/use-file-base64";

interface ChatClientWithIdProps extends ChatClientPropsPartial {
  chatIdd: string;
  id: string;
  idChat: string;
}

export default function ChatClientWithId({
  chatItem,
  chatMessages,
  chatIdd,
  id,
  idChat,
}: ChatClientWithIdProps) {
  console.log("yesssssssssssssssssss");
  const clientGetChatMessages = useQuery(api.chat.getChatById, { id: chatIdd });

  const {
    newChat,
    setNewChat,
    setGetError,
    active,
    setActive,
    direction,
    setDirection,
    setFileExists,
    fileExists,
    selectedModel,
    setSelectedModel,
    visionModel,
    setVisionModel,
  } = useGlobalstate();
  const router = useRouter();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [showExperimentalModels, setShowExperimentalModels] = useState(false);
  const { attachments, setAttachments } = useGlobalstate();
  const { base64, convert, error, loading } = useFileToBase64();
  // const visionModel = useMemo(() => {
  //   return models.every((item) => {
  //     if (item.value === selectedModel) {
  //       return item.vision === true;
  //     }
  //     return false;
  //   });
  // }, [models, selectedModel, setSelectedModel]);

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg",
    maxSize: 1024 * 1024 * 2,
    multiple: false,
    maxFiles: 1,
  });

  useEffect(() => {
    setFileExists(files.length > 0);
    const visionModel = models.every((item) => {
      if (item.value === selectedModel) {
        return item.vision === true;
      }
      return false;
    });

    setVisionModel(() => visionModel);

    if (files.length > 0 && !visionModel) {
      setSelectedModel("mmd-google/gemini-2.0-flash-exp:free"); // مدل پیش‌فرض با قابلیت پردازش تصویر
    }
  }, [
    files,
    setFileExists,
    selectedModel,
    setSelectedModel,
    visionModel,
    setVisionModel,
  ]);
  useEffect(() => {
    setFileExists(files.length > 0);
  }, [files, setFileExists]);

  // Load model preference from session storage
  useLayoutEffect(() => {
    const storedModel = sessionStorage.getItem("model");

    if (storedModel) {
      setSelectedModel(storedModel);
    }
    if (chatIdd) {
      setActive(true);
    } else {
      setActive(false);
    }
  }, [chatIdd]);

  // Set up chat with AI SDK
  const {
    messages,
    input,
    handleSubmit,
    stop,
    setInput,
    status,
    setMessages,
    reload,
    append,
  } = useChat({
    id: idChat,
    experimental_throttle: 100,
    maxSteps: 2,
    api: "/api/chat",
    initialMessages: clientGetChatMessages?.chatMessages
      ? convertToUIMessages(clientGetChatMessages.chatMessages)
      : undefined,
    experimental_prepareRequestBody: (body) => ({
      id,
      message: body.messages.at(-1),
      chatId: chatIdd,
      model:
        files.length > 0 && !visionModel
          ? "mmd-google/gemini-2.0-flash-exp:free"
          : selectedModel.length > 0
            ? selectedModel
            : "mmd-meta-llama/llama-3.3-8b-instruct:free",
    }),
    onError: (error) => {
      console.log("error", error);
      setGetError(true);
    },
    onFinish: () => {
      // "mmd-google/gemini-2.0-flash-exp:free"
      console.log("onFinish");
      if (attachments.length > 0) {
        setAttachments([]);
        // clearFiles();
      }
    },
  });

  // Handle new chat state
  useEffect(() => {
    if (newChat) {
      setMessages([]);
      setNewChat(false);
    }
  }, [newChat, setMessages, setNewChat]);

  useEffect(() => {
    if (
      messages.length === 0 &&
      clientGetChatMessages?.chatMessages &&
      clientGetChatMessages.chatMessages.length > 0
    ) {
      setMessages(convertToUIMessages(clientGetChatMessages.chatMessages));
    }
  }, [messages, clientGetChatMessages, setMessages]);

  // Handle keyboard submission
  const handleKeyboardSubmit = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (status !== "ready") {
          toast.error("Please wait for the previous message to be sent");
        } else {
          // setInput("");
          setActive(true);
          if (files.length > 0) {
            try {
              const result = await convert(files[0].file as File);
              handleSubmit(undefined, {
                experimental_attachments: [
                  {
                    url: result,
                    name: files[0].file.name,
                    contentType: files[0].file.type,
                  },
                ],
              });
              clearFiles();
            } catch (err) {
              toast.error("خطا در تبدیل فایل به base64");
            }
            // setAttachments([]);
          } else {
            handleSubmit();
          }
        }
      }
    },
    [status, handleSubmit]
  );

  // Handle click submission
  const handleClickSubmit = useCallback(async () => {
    setActive(true);
    if (files.length > 0) {
      try {
        const result = await convert(files[0].file as File);
        handleSubmit(undefined, {
          experimental_attachments: [
            {
              url: result,
              name: files[0].file.name,
              contentType: files[0].file.type,
            },
          ],
        });
        clearFiles();
      } catch (err) {
        toast.error("خطا در تبدیل فایل به base64");
      }
      // setAttachments([]);
    } else {
      handleSubmit();
    }
  }, [input, setInput, setActive, router, idChat, attachments]);

  return (
    // <div className={cn(" h-dvh w-dvw flex flex-col overflow-hidden ")}>
    <div className={cn(" flex h-full w-full flex-col")}>
      {/* Header */}
      <div className="px-4 pt-3 pb-1 shrink-0 h-[52px] ">
        <SidebarToggle />
      </div>

      {/* Loading state */}
      {clientGetChatMessages === undefined && messages.length === 0 && (
        <div className=" w-full h-full    ">
          <div className="flex items-center justify-center h-full w-full  shrink-0 ">
            <Loader2 className="size-6 animate-spin" />
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <MessageBar
          messages={messages}
          clientChatMessage={clientGetChatMessages}
          endOfMessagesRef={endOfMessagesRef as React.RefObject<HTMLDivElement>}
          status={status}
          reload={reload}
        />
      )}

      {/* Input form */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className={cn(
          "w-full bg-transparent  ",
          active ? "" : " flex items-center justify-center"
        )}
      >
        <MotionConfig transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
          <motion.div
            className="md:mb-4 mb-2 w-full px-[16px] sm:px-[0px] bg-transparent  "
            layoutId="chat-input"
            layout="position"
          >
            {/* Input container */}
            <div
              className="flex items-center justify-center relative bg-transparent "
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              data-dragging={isDragging || undefined}
              data-files={files.length > 0 || undefined}
            >
              <div
                className={cn(
                  "border-token-border-default bg-token-bg-primary flex grow",
                  "max-w-(--thread-content-max-width) [--thread-content-max-width:32rem]",
                  "@[34rem]:[--thread-content-max-width:40rem] @[64rem]:[--thread-content-max-width:48rem]",
                  "lg:[--thread-content-max-width:50rem]",
                  "cursor-text flex-col items-center justify-center rounded-[28px]",
                  "border bg-clip-padding shadow-sm contain-inline-size sm:shadow-lg",
                  "dark:bg-[#303030] dark:shadow-none! relative ",
                  isDragging && "bg-blue-400"
                )}
              >
                <PreviewImg
                  files={files}
                  clearFiles={clearFiles}
                  removeFile={removeFile}
                />
                <div
                  className={cn(
                    "relative w-full p-[10px] flex flex-col justify-between min-h-[120px]"
                  )}
                >
                  {/* Text input */}
                  <Textarea
                    id={id}
                    value={input}
                    autoFocus
                    placeholder="Ask anything"
                    className={cn(
                      "field-sizing-content max-h-29.5 min-h-0 resize-none text-[16px] text-[#0d0d0d] placeholder:text-[16px] disabled:opacity-50",
                      files.length > 0 && "mb-2"
                    )}
                    onChange={(e) => {
                      const direction = useDirection(e.target.value);
                      setDirection(direction);
                      setInput(e.target.value);
                    }}
                    disabled={status === "streaming" || status === "submitted"}
                    onKeyDown={handleKeyboardSubmit}
                  />
                  <input
                    {...getInputProps()}
                    className="sr-only"
                    aria-label="Upload image file"
                  />
                  {/* Tools and actions */}
                  <div className="flex h-[36px] items-center justify-between gap-2">
                    {/* Model switcher */}
                    <div className="flex items-center gap-2">
                      <div>
                        <ModelSwitcher
                          selectedModel={
                            files.length > 0 && !visionModel
                              ? "mmd-google/gemini-2.0-flash-exp:free"
                              : selectedModel.length > 0
                                ? selectedModel
                                : "mmd-meta-llama/llama-3.3-8b-instruct:free"
                          }
                          setSelectedModel={setSelectedModel}
                          showExperimentalModels={showExperimentalModels}
                          attachments={[]}
                          messages={messages}
                          status={status}
                          onModelSelect={(model) => {
                            // Show additional info about image attachments for vision models
                            const isVisionModel = model.vision === true;
                          }}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {searchTools.map((tool) => {
                        const isStreaming =
                          status === "streaming" || status === "submitted";
                        const isInputEmpty = input.trim().length === 0;

                        // فقط upload و ActionButton را نمایش بده
                        if (tool.name === "StopButton") return null;

                        // تغییر آیکن دکمه ActionButton در حالت استریم
                        const Icon =
                          tool.name === "ActionButton"
                            ? isStreaming
                              ? searchTools.find((t) => t.name === "StopButton")
                                  ?.icon || tool.icon
                              : tool.icon
                            : tool.icon;

                        // اصلاح شده: فقط وقتی ورودی خالی باشه و در حالت idle باشیم دکمه غیرفعاله
                        const isDisabled =
                          (tool.name === "upload" && isStreaming) ||
                          (tool.name === "ActionButton" &&
                            isInputEmpty &&
                            !isStreaming);

                        const handleClick = () => {
                          if (tool.name === "upload" && !isStreaming) {
                            openFileDialog();
                          }

                          if (tool.name === "ActionButton") {
                            if (isStreaming) {
                              stop();
                            } else if (!isInputEmpty) {
                              handleClickSubmit();
                            }
                          }
                        };

                        return (
                          <TooltipContainer
                            key={tool.name}
                            tooltipContent={
                              isStreaming && tool.name === "ActionButton"
                                ? "Stopping..."
                                : tool.description
                            }
                          >
                            <div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-300 fill-[#5d5d5d]",
                                tool.name === "upload" && "hover:bg-gray-100",
                                tool.name === "ActionButton" &&
                                  "bg-black fill-white",
                                isDisabled &&
                                  "opacity-50 pointer-events-none hover:cursor-not-allowed",
                                !isDisabled && "hover:cursor-pointer"
                              )}
                              onClick={handleClick}
                            >
                              <Icon />
                            </div>
                          </TooltipContainer>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </MotionConfig>
      </form>
    </div>
  );
}
