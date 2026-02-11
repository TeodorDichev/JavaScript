import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorHandler } from "../../../../../public/static/scripts/utils/error-handler.js";

describe("ErrorHandler", () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.stubGlobal("alert", vi.fn());
  });

  it("should not do anything if apiResponse is ok", () => {
    document.body.innerHTML = '<div id="error-container"></div>';
    ErrorHandler.handle({ ok: true });

    const container = document.getElementById("error-container");
    expect(container.innerHTML).toBe("");
    expect(window.alert).not.toHaveBeenCalled();
  });

  it("should fallback to default 'error-container' if provided ID does not exist", () => {
    document.body.innerHTML = '<div id="error-container" style="display: none;"></div>';
    const response = { ok: false, message: "Fallback Success" };

    ErrorHandler.handle(response, "missing-id");

    const defaultContainer = document.getElementById("error-container");

    expect(defaultContainer.style.display).toBe("flex");
    expect(defaultContainer.innerHTML).toContain("Fallback Success");
    expect(window.alert).not.toHaveBeenCalled();
  });

  it("should show global alert ONLY if no containers exist at all", () => {
    document.body.innerHTML = '';
    const response = {
      ok: false,
      message: "Global Error",
      errors: ["Detail 1"]
    };

    ErrorHandler.handle(response, "any-id");

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Global Error\n\nДетайли:\n- Detail 1")
    );
  });

  it("should render HTML with correct structure inside container", () => {
    document.body.innerHTML = '<div id="target"></div>';
    const response = {
      ok: false,
      message: "Validation Failed",
      errors: ["Invalid Email", "Too short"],
    };

    ErrorHandler.handle(response, "target");

    const container = document.getElementById("target");
    expect(container.style.display).toBe("flex");
    
    const errorBox = container.querySelector(".error-box");
    expect(errorBox).toBeTruthy();
    
    const strong = errorBox.querySelector("strong");
    expect(strong.textContent).toBe("Validation Failed");
    const listItems = errorBox.querySelectorAll("li");
    expect(listItems.length).toBe(2);
    expect(listItems[0].textContent).toBe("Invalid Email");
    expect(errorBox.querySelector(".close-error")).toBeTruthy();
  });

  it("should hide container when close button is clicked", () => {
    document.body.innerHTML = '<div id="target"></div>';
    ErrorHandler.handle({ ok: false, message: "Temporary Error" }, "target");

    const container = document.getElementById("target");
    const closeBtn = container.querySelector(".close-error");
    
    closeBtn.click();

    expect(container.style.display).toBe("none");
    expect(container.querySelector(".error-box")).toBeNull();
  });

  it("should clear the container and reset display state", () => {
    document.body.innerHTML = '<div id="target" style="display: block;">Old Error</div>';
    
    ErrorHandler.clear("target");

    const container = document.getElementById("target");
    expect(container.innerHTML).toBe("");
    expect(container.style.display).toBe("none");
  });
});