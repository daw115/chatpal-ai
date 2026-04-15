import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage } from "./ChatMessage";

describe("ChatMessage", () => {
  it("renders user message correctly", () => {
    render(<ChatMessage role="user" content="Hello, AI!" />);
    expect(screen.getByText("Hello, AI!")).toBeInTheDocument();
  });

  it("renders assistant message correctly", () => {
    render(<ChatMessage role="assistant" content="Hello, human!" />);
    expect(screen.getByText("Hello, human!")).toBeInTheDocument();
  });

  it("shows edit button for user messages", () => {
    const onEdit = vi.fn();
    render(<ChatMessage role="user" content="Test message" onEdit={onEdit} />);

    const editButton = screen.getByText("Edytuj");
    expect(editButton).toBeInTheDocument();
  });

  it("shows regenerate button for last assistant message", () => {
    const onRegenerate = vi.fn();
    render(
      <ChatMessage
        role="assistant"
        content="Test response"
        isLast={true}
        onRegenerate={onRegenerate}
      />
    );

    const regenerateButton = screen.getByText("Regeneruj");
    expect(regenerateButton).toBeInTheDocument();
  });

  it("calls onEdit when edit is saved", () => {
    const onEdit = vi.fn();
    render(<ChatMessage role="user" content="Original message" onEdit={onEdit} />);

    // Click edit button
    const editButton = screen.getByText("Edytuj");
    fireEvent.click(editButton);

    // Change text
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited message" } });

    // Save
    const saveButton = screen.getByText("Zapisz");
    fireEvent.click(saveButton);

    expect(onEdit).toHaveBeenCalledWith("Edited message");
  });

  it("does not show action buttons when streaming", () => {
    render(
      <ChatMessage
        role="assistant"
        content="Streaming..."
        isStreaming={true}
        isLast={true}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.queryByText("Regeneruj")).not.toBeInTheDocument();
  });
});
