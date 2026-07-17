# store.js:88 更新区域数据失败…

> **Workspace:** e:\工作文件\地图标注

---

**User**

store.js:88 更新区域数据失败: 
 {code: 105, error: 'It is a reserved field: objectId.'} 
 updateArea 
 @ 
 store.js:88 
 await in updateArea 
 handleSaveArea 
 @ 
 app.js:129 
 (匿名) 
 @ 
 app.js:57 
 
 编辑区域信息的时候报错了

**Assistant**

问题已经定位并修复。

产生该报错的原因是 Bmob SDK 在更新数据时，如果直接使用 `query.set('objectId', id)`，会被后端拒绝并抛出 `It is a reserved field: objectId.` 错误。在 Bmob 中，指定要更新的数据条目需要使用保留字段 `id`，即 `query.set('id', id)`。

同时，我还修复了另一个潜在的渲染问题：原本在 `app.js` 的保存逻辑中，直接将 `updateArea` 的返回值替换原有的区域对象（由于之前方法没有 return，还会导致覆盖为空），这会导致该区域的多边形路径 (`path` 字段) 丢失并在地图上消失。

我已经为您修改了以下文件：

**1. 修改 [store.js](file:///e:/工作文件/地图标注/js/store.js)**
将 `updateArea` 方法中的 `objectId` 改为正确的 `id`：
```javascript
  async updateArea(id, updates) {
    try {
      const query = Bmob.Query('DeliveryArea');
      query.set('id', id); // 修复报错：使用 id 而不是 objectId
      if (updates.name) query.set('name', updates.name);
      if (updates.color) query.set('color', updates.color);
      if (updates.path) query.set('path', JSON.stringify(updates.path));
      
      await query.save();
      return true;
    } catch (e) {
      // ...
    }
  }
```

**2. 优化 [app.js](file:///e:/工作文件/地图标注/js/app.js)**
将 `handleSaveArea` 中的编辑逻辑改为合并本地数据，而不是直接被 `updateArea` 的返回值覆盖，从而避免丢失未修改的字段（如 `path`）：
```javascript
      if (this.editingAreaId) {
        // 编辑模式
        await window.Store.updateArea(this.editingAreaId, { name, color });
        
        // 更新本地状态，保留原有 path 数据
        const index = this.areas.findIndex(a => a.id === this.editingAreaId);
        if (index !== -1) {
          this.areas[index] = { ...this.areas[index], name, color };
        }
        this.mapManager.renderAreas(this.areas);
        this.renderList();
        this.closeModal();
        this.editingAreaId = null;
      }
```

现在重新编辑区域信息，应该可以成功保存且不会报错了。您可以刷新页面测试一下。

---

**User**

还有一个问题，我需要一个登录注册功能，我需要注册七个账号，给七个不同的单位用，他们之间的数据是根据账号来显示的 ，给我一个方案

**Assistant**

基于现有的 Bmob 后端，最快且最稳妥的方案是利用 Bmob 自带的用户系统（_User 表）来实现数据隔离。

以下是具体实施方案：

一、 数据库与架构调整
1. 账号管理：直接使用 Bmob 默认的 _User 表，不需要新建表。
2. 数据关联：在现有的 DeliveryArea 表中，逻辑上新增一个 userId 字段（String类型）。每次保存区域时，把当前登录账号的 objectId 存进去。

二、 核心逻辑改造 (store.js)
1. 增加登录功能：使用 Bmob.User.login(账号, 密码)。
2. 改造查询逻辑：在 fetchAreas 方法中，增加查询条件，只拉取 userId 等于当前登录账号的数据。
3. 改造保存逻辑：在 saveArea 方法中，强制写入 userId 字段。

三、 前端 UI 调整 (index.html & app.js)
1. 增加登录弹窗：页面加载时检查 Bmob.User.current()，如果为空，则弹出全屏遮罩的登录框，强制要求登录。
2. 增加退出功能：界面角落增加“退出登录”按钮，调用 Bmob.User.logout() 并刷新页面。

四、 核心代码参考

登录逻辑：
```javascript
// 登录
async function login(username, password) {
  try {
    let user = await Bmob.User.login(username, password);
    return user;
  } catch (e) {
    alert('账号或密码错误');
  }
}
```

数据隔离改造 (store.js)：
```javascript
// 1. 获取时过滤
async fetchAreas() {
  let current = Bmob.User.current();
  if (!current) return []; // 未登录不返回数据
  
  const query = Bmob.Query("DeliveryArea");
  query.equalTo("userId", "==", current.objectId); // 核心：只查自己的数据
  // ... 后续逻辑不变
}

// 2. 保存时绑定
async saveArea(area) {
  let current = Bmob.User.current();
  const query = Bmob.Query('DeliveryArea');
  
  query.set("userId", current.objectId); // 核心：绑定数据归属
  query.set("name", area.name || '未命名区域');
  // ... 后续逻辑不变
}
```

五、 商业化落地建议
既然是给 7 个确定的单位使用，建议 放弃开放注册功能。
你可以写一个临时脚本，一次性把这 7 个账号（如 unit1 到 unit7）注册好并分配好密码。前端页面 只提供登录框，不提供注册入口。这样既能保证数据安全，又能提升系统的封闭性和专业感。

需要我直接帮你把这套登录 UI 和数据隔离逻辑写进现有的代码里吗？

---

