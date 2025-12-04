/**
 * 友链自主提交功能
 * 依赖 plugin-links-submit 插件提供的 LinksSubmit API
 */

interface LinkSubmitConfig {
  enableSubmit: boolean;
  verifyType: 'email' | 'captcha' | 'none';
}

declare global {
  interface Window {
    LinksSubmit?: {
      submit: (data: any, verifyCode: string) => Promise<any>;
      getLinkGroups: () => Promise<any[]>;
      sendVerifyCode: (email: string) => Promise<any>;
      getLinkDetail: (url: string) => Promise<any>;
      getCaptchaUrl: () => string;
    };
    linkSubmitConfig?: LinkSubmitConfig;
  }
}

let linkSubmitReady = false;
let sendCodeCountdown = 0;

// 打开弹窗
export function openLinkSubmitModal(): void {
  const modal = document.getElementById('link-submit-modal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    loadLinkGroups();
    // 刷新验证码
    if (window.linkSubmitConfig?.verifyType === 'captcha') {
      refreshCaptcha();
    }
  }
}

// 关闭弹窗
export function closeLinkSubmitModal(): void {
  const modal = document.getElementById('link-submit-modal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// 加载分组列表
async function loadLinkGroups(): Promise<void> {
  if (!window.LinksSubmit) return;
  try {
    const groups = await window.LinksSubmit.getLinkGroups();
    const select = document.getElementById('link-group') as HTMLSelectElement;
    const wrapper = document.getElementById('link-group-wrapper');
    if (groups && groups.length > 0 && select && wrapper) {
      select.innerHTML = '<option value="">默认分组</option>';
      groups.forEach((g: any) => {
        const opt = document.createElement('option');
        opt.value = g.groupId;
        opt.textContent = g.groupName;
        select.appendChild(opt);
      });
      wrapper.style.display = '';
    }
  } catch (e) {
    console.error('获取分组失败:', e);
  }
}

// 刷新图形验证码
export function refreshCaptcha(): void {
  if (!window.LinksSubmit) return;
  const img = document.getElementById('captcha-img') as HTMLImageElement;
  if (img) {
    img.src = window.LinksSubmit.getCaptchaUrl();
  }
}

// 自动获取网站信息
export async function autoFetchSiteInfo(): Promise<void> {
  if (!window.LinksSubmit) return;
  const urlInput = document.getElementById('link-url') as HTMLInputElement;
  const url = urlInput?.value.trim();
  if (!url) {
    showMessage('请先输入网站地址', 'error');
    return;
  }

  const btn = document.getElementById('auto-fetch-btn') as HTMLButtonElement;
  const icon = btn?.querySelector('span:first-child') as HTMLElement;
  const text = btn?.querySelector('span:last-child') as HTMLElement;
  if (!btn || !icon || !text) return;
  
  const originalIcon = icon.className;
  const originalText = text.textContent || '';

  icon.className = 'icon-[ph--spinner] animate-spin';
  text.textContent = '获取中...';
  btn.disabled = true;

  try {
    const res = await window.LinksSubmit.getLinkDetail(url);
    if (res.code === 200 && res.data) {
      const info = res.data;
      const nameInput = document.getElementById('link-name') as HTMLInputElement;
      const descInput = document.getElementById('link-desc') as HTMLTextAreaElement;
      const logoInput = document.getElementById('link-logo') as HTMLInputElement;
      
      if (info.title && nameInput) nameInput.value = info.title;
      if (info.description && descInput) descInput.value = info.description;
      if ((info.image || info.icon) && logoInput) logoInput.value = info.image || info.icon;
      showMessage('获取成功！请检查并补充信息', 'success');
    } else {
      showMessage(res.msg || '获取失败', 'error');
    }
  } catch (e: any) {
    showMessage(e.msg || '获取失败', 'error');
  } finally {
    icon.className = originalIcon;
    text.textContent = originalText;
    btn.disabled = false;
  }
}

// 发送验证码
export async function sendVerifyCode(): Promise<void> {
  if (!window.LinksSubmit) return;
  if (sendCodeCountdown > 0) return;

  const emailInput = document.getElementById('link-email') as HTMLInputElement;
  const email = emailInput?.value.trim();
  if (!email) {
    showMessage('请先输入邮箱地址', 'error');
    return;
  }

  const btn = document.getElementById('send-code-btn') as HTMLButtonElement;
  const icon = btn?.querySelector('span:first-child') as HTMLElement;
  const text = btn?.querySelector('span:last-child') as HTMLElement;
  if (!btn || !icon || !text) return;
  
  const originalIcon = icon.className;

  icon.className = 'icon-[ph--spinner] animate-spin';
  text.textContent = '发送中...';
  btn.disabled = true;

  try {
    const res = await window.LinksSubmit.sendVerifyCode(email);
    if (res.code === 200) {
      showMessage('验证码已发送，请查收邮箱', 'success');
      sendCodeCountdown = 60;
      const countdownTimer = setInterval(() => {
        sendCodeCountdown--;
        text.textContent = `${sendCodeCountdown}s`;
        if (sendCodeCountdown <= 0) {
          clearInterval(countdownTimer);
          icon.className = originalIcon;
          text.textContent = '发送验证码';
          btn.disabled = false;
        }
      }, 1000);
    } else {
      throw { msg: res.msg };
    }
  } catch (e: any) {
    icon.className = originalIcon;
    text.textContent = '发送验证码';
    btn.disabled = false;
    showMessage(e.msg || '发送失败', 'error');
  }
}

// 显示提示信息
function showMessage(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const msgEl = document.getElementById('submit-message');
  if (msgEl) {
    // 图标符号
    const icons = { success: '✓', error: '✕', info: 'i' };
    msgEl.innerHTML = `
      <span class="msg-icon">${icons[type]}</span>
      <span class="msg-text">${msg}</span>
    `;
    msgEl.className = `submit-message ${type}`;
    msgEl.style.display = 'flex';
    
    // 滚动到弹窗顶部，确保用户能看到消息
    const content = document.querySelector('.link-submit-content');
    if (content) {
      content.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // 成功消息保持更长时间
    const duration = type === 'success' ? 8000 : 5000;
    setTimeout(() => {
      msgEl.style.display = 'none';
    }, duration);
  }
}

// 提交表单
async function handleLinkSubmit(e: Event): Promise<void> {
  e.preventDefault();
  if (!window.LinksSubmit) return;

  const form = document.getElementById('link-submit-form') as HTMLFormElement;
  const formData = new FormData(form);
  const config = window.linkSubmitConfig;
  
  const data: any = {
    displayName: formData.get('displayName'),
    url: formData.get('url'),
    logo: formData.get('logo') || undefined,
    email: formData.get('email'),
    description: formData.get('description') || undefined,
    linkPageUrl: formData.get('linkPageUrl') || undefined,
    groupName: formData.get('groupName') || undefined,
    rssUrl: formData.get('rssUrl') || undefined,
  };
  
  // 根据配置获取验证码
  let verifyCode = '';
  const verifyType = config?.verifyType || 'email';
  
  if (verifyType === 'email') {
    verifyCode = formData.get('verifyCode') as string || '';
    if (!verifyCode) {
      showMessage('请输入邮箱验证码', 'error');
      return;
    }
  } else if (verifyType === 'captcha') {
    verifyCode = formData.get('captcha') as string || '';
    if (!verifyCode) {
      showMessage('请输入图形验证码', 'error');
      return;
    }
  }

  const btn = document.getElementById('submit-btn') as HTMLButtonElement;
  const icon = btn?.querySelector('span:first-child') as HTMLElement;
  const text = btn?.querySelector('span:last-child') as HTMLElement;
  if (!btn || !icon || !text) return;
  
  const originalIcon = icon.className;
  const originalText = text.textContent || '';

  icon.className = 'icon-[ph--spinner] animate-spin';
  text.textContent = '提交中...';
  btn.disabled = true;

  try {
    const res = await window.LinksSubmit.submit(data, verifyCode);
    if (res.code === 200) {
      showMessage(res.msg || '提交成功！请等待审核', 'success');
      form.reset();
      setTimeout(() => {
        closeLinkSubmitModal();
      }, 2000);
    } else {
      throw { msg: res.msg };
    }
  } catch (e: any) {
    showMessage(e.msg || '提交失败', 'error');
    // 刷新验证码
    if (verifyType === 'captcha') {
      refreshCaptcha();
    }
  } finally {
    icon.className = originalIcon;
    text.textContent = originalText;
    btn.disabled = false;
  }
}

// 初始化
export function initLinkSubmit(): void {
  const config = window.linkSubmitConfig;
  if (!config?.enableSubmit) return;

  // 延迟检测，等待插件脚本加载
  setTimeout(() => {
    if (window.LinksSubmit) {
      linkSubmitReady = true;
      const entry = document.getElementById('link-submit-entry');
      if (entry) entry.style.display = '';
      
      // 绑定表单提交事件
      const form = document.getElementById('link-submit-form');
      if (form) {
        form.addEventListener('submit', handleLinkSubmit);
      }
      
      // 检查 URL hash
      if (window.location.hash === '#add') {
        openLinkSubmitModal();
      }
    } else {
      console.warn('[Clarity] LinksSubmit 插件未加载，自主提交功能不可用');
    }
  }, 500);

  // 监听 hash 变化
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#add' && linkSubmitReady) {
      openLinkSubmitModal();
    }
  });
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).openLinkSubmitModal = openLinkSubmitModal;
  (window as any).closeLinkSubmitModal = closeLinkSubmitModal;
  (window as any).autoFetchSiteInfo = autoFetchSiteInfo;
  (window as any).sendVerifyCode = sendVerifyCode;
  (window as any).refreshCaptcha = refreshCaptcha;
  (window as any).initLinkSubmit = initLinkSubmit;
}
