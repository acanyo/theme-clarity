# LinksSubmit Global API 使用文档

`linkssubmit.js` 提供了一个全局对象 `window.LinksSubmit`，允许主题开发者在任何地方便捷地调用友链提交插件的相关接口。

## 1. 提交友链

提交友链申请。

### 接口定义

```javascript
LinksSubmit.submit(data, verifyCode)
```

### 参数说明

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `data` | Object | 是 | 包含友链信息的对象 |
| `verifyCode` | String | 是 | 验证码 |

**`data` 对象结构：**

| 属性名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `displayName` | String | 是 | 网站名称 |
| `url` | String | 是 | 网站地址 |
| `logo` | String | 否 | 网站图标 URL |
| `email` | String | 是 | 联系邮箱 |
| `description` | String | 否 | 网站描述 |
| `linkPageUrl` | String | 否 | 友链页面地址 |
| `groupName` | String | 否 | 分组 ID (注意：虽然字段名叫 groupName，实际传的是 groupId) |
| `rssUrl` | String | 否 | RSS 地址 |

### 示例代码

```javascript
const formData = {
    displayName: "我的博客",
    url: "https://example.com",
    logo: "https://example.com/logo.png",
    email: "test@example.com",
    description: "这是一个示例博客",
    groupName: "group-id-123" // 可选
};
const verifyCode = "123456"; // 用户输入的验证码

LinksSubmit.submit(formData, verifyCode)
    .then(response => {
        if (response.code === 200) {
            console.log("提交成功", response.msg);
            // 处理成功逻辑
        } else {
            console.error("提交失败", response.msg);
        }
    })
    .catch(error => {
        console.error("请求出错", error.msg || "网络错误");
    });
```

---

## 2. 获取友链分组

获取后台配置的友链分组列表。

### 接口定义

```javascript
LinksSubmit.getLinkGroups()
```

### 示例代码

```javascript
LinksSubmit.getLinkGroups()
    .then(groups => {
        // groups 是一个数组
        groups.forEach(group => {
            console.log(`分组名: ${group.groupName}, ID: ${group.groupId}`);
        });
    })
    .catch(error => {
        console.error("获取分组失败", error);
    });
```

---

## 3. 发送验证码

向指定邮箱发送验证码。

### 接口定义

```javascript
LinksSubmit.sendVerifyCode(email)
```

### 参数说明

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `email` | String | 是 | 接收验证码的邮箱地址 |

### 示例代码

```javascript
const email = "test@example.com";

LinksSubmit.sendVerifyCode(email)
    .then(response => {
        if (response.code === 200) {
            console.log("验证码发送成功");
            // 开始倒计时等UI操作
        }
    })
    .catch(error => {
        console.error("发送失败", error.msg);
    });
```

---

## 4. 获取网站详情 (自动填写)

根据输入的 URL 自动抓取网站标题、描述、Logo 等信息。

### 接口定义

```javascript
LinksSubmit.getLinkDetail(url)
```

### 参数说明

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `url` | String | 是 | 目标网站 URL |

### 示例代码

```javascript
const url = "https://example.com";

LinksSubmit.getLinkDetail(url)
    .then(response => {
        if (response.code === 200) {
            const info = response.data;
            console.log("标题:", info.title);
            console.log("描述:", info.description);
            console.log("Logo:", info.image || info.icon);
            
            // 自动填充表单
        }
    })
    .catch(error => {
        console.error("获取详情失败", error.msg);
    });
```

---

## 5. 获取验证码图片 URL

获取图形验证码的 URL 地址。通常用于刷新验证码图片。

### 接口定义

```javascript
LinksSubmit.getCaptchaUrl()
```

### 返回值

*   `String`: 带有随机参数的验证码图片 URL。

### 示例代码

```javascript
const imgElement = document.getElementById('captcha-img');
imgElement.src = LinksSubmit.getCaptchaUrl();
```

---

## 错误处理说明

所有返回 Promise 的接口（除了 `getCaptchaUrl`）在发生错误时都会 reject。
错误对象通常包含 `msg` 属性，表示错误信息。

```javascript
.catch(error => {
    if (error.status === 429) {
        console.warn("操作太频繁，请稍后再试");
    }
    alert(error.msg || "网络错误");
})
```
