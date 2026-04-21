const copyButton = document.querySelector("[data-copy-target]");

if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const targetId = copyButton.getAttribute("data-copy-target");
    const target = document.getElementById(targetId);
    if (!target) return;

    try {
      await navigator.clipboard.writeText(target.textContent);
      copyButton.textContent = "Copied";
      copyButton.dataset.copied = "true";
      window.setTimeout(() => {
        copyButton.textContent = "Copy";
        copyButton.dataset.copied = "false";
      }, 1600);
    } catch (_error) {
      copyButton.textContent = "Copy manually";
    }
  });
}

const currentYear = document.getElementById("current-year");
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
