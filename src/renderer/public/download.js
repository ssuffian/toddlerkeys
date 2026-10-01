const copyButton = document.querySelector('#copy-linux-install');
const commands = document.querySelector('#linux-install-commands');
const copyStatus = document.querySelector('#copy-status');

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy command was rejected');
}

copyButton?.addEventListener('click', async () => {
  const text = commands?.textContent?.trim();
  if (!text) return;

  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else fallbackCopy(text);
    copyButton.textContent = 'Copied!';
    copyButton.classList.add('copied');
    if (copyStatus) copyStatus.textContent = 'Linux installation commands copied to the clipboard.';
    window.setTimeout(() => {
      copyButton.textContent = 'Copy commands';
      copyButton.classList.remove('copied');
      if (copyStatus) copyStatus.textContent = '';
    }, 2000);
  } catch {
    if (copyStatus) copyStatus.textContent = 'Copy failed. Select the commands and copy them manually.';
  }
});
