export class ErrorHandler {
  static handle(apiResponse, containerId = null) {
    if (apiResponse.ok) return;

    const message = apiResponse.message || "Възникна неочаквана грешка";
    const errors = apiResponse.errors || [];

    const targets = [containerId, "error-container"].filter(
      (id) => typeof id === "string",
    );

    for (const id of targets) {
      if (this._renderInContainer(id, message, errors)) {
        return;
      }
    }

    this._showGlobalError(message, errors);
  }

  static _renderInContainer(containerId, message, errors) {
    const container = document.getElementById(containerId);
    if (!container) return false;

    const errorBox = document.createElement("div");
    errorBox.className = "error-box";

    const title = document.createElement("strong");
    title.textContent = message;
    errorBox.appendChild(title);

    if (errors.length > 0) {
      const list = document.createElement("ul");
      errors.forEach((err) => {
        const li = document.createElement("li");
        li.textContent = err;
        list.appendChild(li);
      });
      errorBox.appendChild(list);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-error';
    closeBtn.textContent = '×';
    
    closeBtn.onclick = () => {
        errorBox.remove();
        if (container.children.length === 0) {
            container.style.display = 'none';
        }
    };

    errorBox.appendChild(closeBtn);
    container.appendChild(errorBox);
    container.style.display = 'flex';

    return true;
  }

  static _showGlobalError(message, errors) {
    const fullMsg =
      errors.length > 0
        ? `${message}\n\nДетайли:\n- ${errors.join("\n- ")}`
        : message;
    alert(fullMsg);
  }

  static clear(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = "";
      container.style.display = "none";
    }
  }
}
