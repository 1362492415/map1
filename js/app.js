/**
 * 业务逻辑入口模块
 */

class App {
  constructor() {
    this.areas = [];
    this.mapManager = null;
    this.tempPath = null; // 正在绘制的临时路径
    this.editingAreaId = null; // 当前正在编辑的区域ID

    // DOM 元素引用
    this.els = {
      // 登录相关
      loginModal: document.getElementById('loginModal'),
      loginBtn: document.getElementById('loginBtn'),
      logoutBtn: document.getElementById('logoutBtn'),
      username: document.getElementById('username'),
      password: document.getElementById('password'),

      // 功能相关
      startDrawBtn: document.getElementById('startDrawBtn'),
      finishDrawBtn: document.getElementById('finishDrawBtn'),
      cancelDrawBtn: document.getElementById('cancelDrawBtn'),
      areaList: document.getElementById('areaList'),
      areaCount: document.getElementById('areaCount'),
      infoModal: document.getElementById('infoModal'),
      areaName: document.getElementById('areaName'),
      areaColor: document.getElementById('areaColor'),
      saveAreaBtn: document.getElementById('saveAreaBtn'),
      closeModalBtn: document.getElementById('closeModalBtn'),
      addressInput: document.getElementById('addressInput'),
      searchBtn: document.getElementById('searchBtn'),
      searchResult: document.getElementById('searchResult')
    };

    this.init();
  }

  init() {
    this.bindAuthEvents();
    this.checkLogin();
  }

  checkLogin() {
    const user = window.Store.getCurrentUser();
    if (user) {
      // 已登录
      this.els.loginModal.classList.add('hidden');
      this.els.logoutBtn.classList.remove('hidden');
      this.startApp();
    } else {
      // 未登录
      this.els.loginModal.classList.remove('hidden');
      this.els.logoutBtn.classList.add('hidden');
    }
  }
  
  startApp() {
    // 确保高德地图脚本加载完成后再初始化
    if (window.AMap) {
      this.mapManager = new MapManager('mapContainer');
      this.loadAreas();
      this.bindEvents();
    } else {
      console.error('AMap is not loaded');
      setTimeout(() => this.startApp(), 500);
    }
  }

  bindAuthEvents() {
    this.els.loginBtn.addEventListener('click', () => this.handleLogin());
    this.els.logoutBtn.addEventListener('click', () => this.handleLogout());
    this.els.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin();
    });
  }

  async handleLogin() {
    const username = this.els.usernameInput.value.trim();
    const password = this.els.passwordInput.value.trim();

    if (!username || !password) {
      alert('请输入账号和密码');
      return;
    }

    const originalText = this.els.loginBtn.textContent;
    this.els.loginBtn.textContent = '登录中...';
    this.els.loginBtn.disabled = true;

    try {
      await window.Store.login(username, password);
      this.checkLogin(); // 登录成功后，重新检查登录状态并启动应用
    } catch (e) {
      alert('账号或密码错误');
    } finally {
      this.els.loginBtn.textContent = originalText;
      this.els.loginBtn.disabled = false;
    }
  }

  async handleLogout() {
    if (confirm('确定要退出登录吗？')) {
      await window.Store.logout();
      window.location.reload(); // 刷新页面回到登录状态
    }
  }
  
  async loadAreas() {
    this.areas = await window.Store.fetchAreas();
    this.renderList();
    this.mapManager.renderAreas(this.areas);
  }

  bindEvents() {
    // 登录/退出
    this.els.loginBtn.addEventListener('click', () => this.handleLogin());
    this.els.logoutBtn.addEventListener('click', () => this.handleLogout());
    this.els.password.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin();
    });

    // 绘制相关
    this.els.startDrawBtn.addEventListener('click', () => this.handleStartDraw());
    this.els.finishDrawBtn.addEventListener('click', () => this.handleFinishDraw());
    this.els.cancelDrawBtn.addEventListener('click', () => this.handleCancelDraw());

    // 弹窗相关
    this.els.saveAreaBtn.addEventListener('click', () => this.handleSaveArea());
    this.els.closeModalBtn.addEventListener('click', () => this.closeModal());

    // 查询相关
    this.els.searchBtn.addEventListener('click', () => this.handleSearch());
    this.els.addressInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });
  }

  // --- 绘制流程 ---
  handleStartDraw() {
    this.els.startDrawBtn.classList.add('hidden');
    this.els.finishDrawBtn.classList.remove('hidden');
    this.els.cancelDrawBtn.classList.remove('hidden');
    
    // 提示用户：点击完成绘制按钮
    document.querySelector('.help-text').textContent = '提示：在地图上点击多点绘制区域，完成后点击“完成绘制”按钮。';
    
    this.mapManager.startDraw((path) => {
      // 绘制完成回调
      this.tempPath = path;
      this.els.cancelDrawBtn.classList.add('hidden');
      this.els.finishDrawBtn.classList.add('hidden');
      this.els.startDrawBtn.classList.remove('hidden');
      document.querySelector('.help-text').textContent = '提示：在地图上点击多点绘制区域，完成后点击“完成绘制”按钮。'; // 恢复默认提示
      this.editingAreaId = null;
      document.querySelector('#infoModal h3').textContent = '保存区域信息';
      this.openModal();
    });
  }

  handleFinishDraw() {
    this.mapManager.finishDraw();
  }

  handleCancelDraw() {
    this.mapManager.cancelDraw();
    this.els.cancelDrawBtn.classList.add('hidden');
    this.els.finishDrawBtn.classList.add('hidden');
    this.els.startDrawBtn.classList.remove('hidden');
    document.querySelector('.help-text').textContent = '提示：在地图上点击多点绘制区域，完成后点击“完成绘制”按钮。'; // 恢复默认提示
  }

  // --- 弹窗逻辑 ---
  openModal() {
    this.els.infoModal.classList.remove('hidden');
    this.els.areaName.value = '';
    this.els.areaName.focus();
  }

  closeModal() {
    this.els.infoModal.classList.add('hidden');
    this.tempPath = null;
  }

  async handleSaveArea() {
    const name = this.els.areaName.value.trim();
    const color = this.els.areaColor.value;

    if (!name) {
      alert('请输入区域名称或负责人');
      return;
    }

    const originalText = this.els.saveAreaBtn.textContent;
    this.els.saveAreaBtn.textContent = '保存中...';
    this.els.saveAreaBtn.disabled = true;

    try {
      if (this.editingAreaId) {
        // 编辑模式
        await window.Store.updateArea(this.editingAreaId, { name, color });
        
        // 更新本地状态
        const index = this.areas.findIndex(a => a.id === this.editingAreaId);
        if (index !== -1) {
          this.areas[index] = { ...this.areas[index], name, color };
        }
        this.mapManager.renderAreas(this.areas);
        this.renderList();
        this.closeModal();
        this.editingAreaId = null;
      } else if (this.tempPath) {
        // 新增模式
        const newArea = await window.Store.saveArea({
          name,
          color,
          path: this.tempPath
        });
        
        this.areas.push(newArea);
        this.mapManager.renderAreas(this.areas);
        this.renderList();
        this.closeModal();
      }
    } catch (e) {
      alert('保存失败，请检查网络后重试');
      console.error(e);
    } finally {
      this.els.saveAreaBtn.textContent = originalText;
      this.els.saveAreaBtn.disabled = false;
    }
  }

  // --- 列表渲染与交互 ---
  renderList() {
    this.els.areaCount.textContent = this.areas.length;
    this.els.areaList.innerHTML = '';

    this.areas.forEach(area => {
      const li = document.createElement('li');
      li.className = 'area-item';
      li.dataset.id = area.id;
      
      li.innerHTML = `
        <div class="area-info">
          <span class="color-dot" style="background-color: ${area.color}"></span>
          <span class="area-name">${area.name}</span>
        </div>
        <div class="area-actions">
          <button class="btn edit-btn" data-id="${area.id}">编辑</button>
          <button class="btn danger-btn" data-id="${area.id}">删除</button>
        </div>
      `;

      // 绑定点击列表项高亮事件
      li.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
          this.highlightArea(area.id);
        }
      });

      // 绑定编辑事件
      const editBtn = li.querySelector('.edit-btn');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleEditArea(area.id);
      });

      // 绑定删除事件
      const delBtn = li.querySelector('.danger-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDeleteArea(area.id);
      });

      this.els.areaList.appendChild(li);
    });
  }

  highlightArea(id) {
    // 列表高亮
    const items = this.els.areaList.querySelectorAll('.area-item');
    items.forEach(item => {
      if (item.dataset.id === id) {
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });

    // 地图多边形高亮
    this.mapManager.highlightPolygon(id);
  }

  handleEditArea(id) {
    const area = this.areas.find(a => a.id === id);
    if (area) {
      this.editingAreaId = id;
      document.querySelector('#infoModal h3').textContent = '编辑区域信息';
      this.els.areaName.value = area.name;
      this.els.areaColor.value = area.color;
      this.els.infoModal.classList.remove('hidden');
      this.els.areaName.focus();
    }
  }

  async handleDeleteArea(id) {
    if (confirm('确定要删除该配送区域吗？')) {
      try {
        await window.Store.deleteArea(id);
        this.areas = this.areas.filter(a => a.id !== id);
        this.mapManager.renderAreas(this.areas);
        this.renderList();
      } catch(e) {
        alert('删除失败，请检查网络');
        console.error(e);
      }
    }
  }

  // --- 查询逻辑 ---
  async handleSearch() {
    const address = this.els.addressInput.value.trim();
    const resEl = this.els.searchResult;
    
    if (!address) {
      resEl.textContent = '请输入地址';
      resEl.className = 'search-result error';
      return;
    }

    resEl.textContent = '查询中...';
    resEl.className = 'search-result';

    try {
      const point = await this.mapManager.geocode(address);
      this.mapManager.setMarker(point);

      // 判断坐标所在多边形
      const targetArea = this.mapManager.findAreaByPoint(point, this.areas);

      if (targetArea) {
        resEl.innerHTML = `匹配成功：该地址属于 <strong>${targetArea.name}</strong> 负责区域`;
        resEl.className = 'search-result success';
        this.highlightArea(targetArea.id);
      } else {
        resEl.textContent = '未找到匹配的配送区域，该地址可能不在派送范围内。';
        resEl.className = 'search-result error';
      }
    } catch (err) {
      resEl.textContent = err.toString();
      resEl.className = 'search-result error';
      console.error(err);
    }
  }
}

// 启动应用
window.addEventListener('DOMContentLoaded', () => {
  window.App = new App();
});
