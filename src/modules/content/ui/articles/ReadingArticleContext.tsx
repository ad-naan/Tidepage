"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ReadingArticle = { slug: string; title: string };
const CurrentArticle = createContext<ReadingArticle | null>(null);
const SetArticle = createContext<(value: ReadingArticle | null) => void>(
  () => {},
);

export function ReadingArticleProvider({ children }: { children: ReactNode }) {
  const [article, setArticle] = useState<ReadingArticle | null>(null);
  return (
    <SetArticle.Provider value={setArticle}>
      <CurrentArticle.Provider value={article}>
        {children}
      </CurrentArticle.Provider>
    </SetArticle.Provider>
  );
}

export function useReadingArticle() {
  return useContext(CurrentArticle);
}

export function useRegisterReadingArticle(slug: string, title: string) {
  const setArticle = useContext(SetArticle);
  useEffect(() => {
    setArticle({ slug, title });
    return () => setArticle(null);
  }, [setArticle, slug, title]);
}
