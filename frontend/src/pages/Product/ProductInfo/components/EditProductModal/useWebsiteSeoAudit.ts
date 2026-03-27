import { useEffect, useState } from "react";
import { auditProductSeo } from "../../../../../lib/productDescApi";
import { normalizeErrorMessage } from "../../../../../lib/textUtils";
import { EMPTY_SEO_EVALUATION, SeoEvaluation } from "./seoScore";

type UseWebsiteSeoAuditParams = {
  shortDescription: string;
  rulesHtml: string;
  descriptionHtml: string;
};

type UseWebsiteSeoAuditResult = {
  evaluation: SeoEvaluation;
  loading: boolean;
  error: string | null;
};

export const useWebsiteSeoAudit = ({
  shortDescription,
  rulesHtml,
  descriptionHtml,
}: UseWebsiteSeoAuditParams): UseWebsiteSeoAuditResult => {
  const [evaluation, setEvaluation] = useState<SeoEvaluation>(
    EMPTY_SEO_EVALUATION
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasContent = Boolean(
      shortDescription.trim() || rulesHtml.trim() || descriptionHtml.trim()
    );

    if (!hasContent) {
      setEvaluation(EMPTY_SEO_EVALUATION);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await auditProductSeo(
          {
            shortDesc: shortDescription,
            rulesHtml,
            descriptionHtml,
          },
          controller.signal
        );
        setEvaluation(result);
        setError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(
          normalizeErrorMessage(
            error instanceof Error ? error.message : String(error ?? ""),
            { fallback: "Không thể lấy điểm SEO từ Website." }
          )
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [descriptionHtml, rulesHtml, shortDescription]);

  return {
    evaluation,
    loading,
    error,
  };
};
