export type DevFeedbackStatus = "open" | "building" | "done" | "dismissed";

export type DevFeedback = {
  id: string;
  org_id: string | null;
  user_id: string;
  page_url: string | null;
  route: string | null;
  element_selector: string | null;
  element_label: string | null;
  comment: string;
  screenshot_path: string | null;
  status: DevFeedbackStatus;
  created_at: string;
};
