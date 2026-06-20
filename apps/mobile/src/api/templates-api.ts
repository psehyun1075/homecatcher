import { apiRequest } from "./client";
import type { TemplateDetail, TemplateSummary } from "./types";

export function listTemplates() {
  return apiRequest<{ templates: TemplateSummary[] }>("/templates");
}

export function getTemplate(templateId: string) {
  return apiRequest<{ template: TemplateDetail }>(`/templates/${templateId}`);
}

export function applyTemplate(familyId: string, templateId: string) {
  return apiRequest<{ application: unknown; createdCounts: Record<string, number> }>(
    `/families/${familyId}/templates/${templateId}/apply`,
    { method: "POST" },
  );
}
