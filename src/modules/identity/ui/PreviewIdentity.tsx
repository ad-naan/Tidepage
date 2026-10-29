"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Github, ArrowRight, Check, LogOut, UserRound } from "lucide-react";
import { Dialog, SpringButton } from "@/shared/ui/primitives";
const IdentityContext = createContext({ loggedIn: false, openLogin: () => {} });
export function usePreviewIdentity() {
  return useContext(IdentityContext);
}
export function PreviewIdentityProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [notice, setNotice] = useState(false);
  return (
    <IdentityContext.Provider
      value={{
        loggedIn,
        openLogin: () => {
          setNotice(false);
          setOpen(true);
        },
      }}
    >
      {children}
      {open && (
        <Dialog
          title={loggedIn ? "你的阅读身份" : "在这里，留下你的回声"}
          onClose={() => setOpen(false)}
        >
          <div className="login-illustration">
            <span className="postage-stamp">
              a<span>✳</span>
            </span>
            <span className="postmark">
              给每一个
              <br />
              认真生活的人
            </span>
          </div>
          <div className="login-content">
            <h2>{loggedIn ? "很高兴又见到你" : "欢迎翻开这一页"}</h2>
            <p>
              {loggedIn
                ? "已切换到登录后的界面预览。"
                : "用熟悉的身份，收藏喜欢的文章，\n和有趣的灵魂交换想法。"}
            </p>
            <SpringButton
              className="github-button"
              onClick={() => setNotice(true)}
            >
              <Github size={19} />
              {loggedIn ? "演示访客 · GitHub" : "使用 GitHub 继续"}
              <ArrowRight size={16} />
            </SpringButton>
            {notice && (
              <div className="login-notice" role="status">
                当前为样式预览，尚未连接 GitHub 授权。
              </div>
            )}
            <div className="login-privileges">
              <span>
                <Check size={12} />
                收藏灵感
              </span>
              <span>
                <Check size={12} />
                参与讨论
              </span>
              <span>
                <Check size={12} />
                留下足迹
              </span>
            </div>
            <button
              className="preview-login-link"
              onClick={() => {
                setLoggedIn(!loggedIn);
                setOpen(false);
              }}
            >
              {loggedIn ? (
                <>
                  <LogOut size={13} />
                  退出演示状态
                </>
              ) : (
                <>
                  预览登录后的效果 <ArrowRight size={13} />
                </>
              )}
            </button>
            <small>界面演示 · 不会获取或上传账号信息</small>
          </div>
        </Dialog>
      )}
    </IdentityContext.Provider>
  );
}
export function LoginTrigger() {
  const { loggedIn, openLogin } = usePreviewIdentity();
  return (
    <SpringButton
      className={`login-trigger ${loggedIn ? "logged-in" : ""}`}
      label={loggedIn ? "查看演示账号" : "登录"}
      onClick={openLogin}
    >
      {loggedIn ? (
        <span className="mini-avatar">访</span>
      ) : (
        <>
          <UserRound size={15} />
          <span>登录</span>
        </>
      )}
    </SpringButton>
  );
}
