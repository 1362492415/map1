/**
 * 数据存储模块 (Bmob 后端云 API)
 * 负责与 Bmob 数据库的交互，实现多端数据同步。
 */

// 初始化 Bmob
Bmob.initialize("ba4204dffe52b0e7", "1234567890123456");

const Store = {
  /**
   * 用户登录
   * @param {string} username 用户名
   * @param {string} password 密码
   * @returns {Promise<Bmob.User>}
   */
  async login(username, password) {
    try {
      return await Bmob.User.login(username, password);
    } catch (e) {
      // 交给上层处理
      alert('账号或密码错误');
      throw e;
    }
  },

  /**
   * 用户登出
   */
  async logout() {
    await Bmob.User.logout();
  },

  /**
   * 获取当前登录用户
   * @returns {Bmob.User | null}
   */
  getCurrentUser() {
    return Bmob.User.current();
  },

  /**
   * 获取当前用户的所有区域
   * @returns {Promise<Array>} DeliveryArea 数组
   */
  async fetchAreas() {
    const user = this.getCurrentUser();
    if (!user) {
      return []; // 未登录则不加载数据
    }
    try {
      const query = Bmob.Query("DeliveryArea");
      query.equalTo("userId", "==", user.objectId); // 核心：只查询和当前用户 ID 匹配的数据
      query.order("-createdAt"); // 按创建时间降序
      const res = await query.find();
      return res.map(item => ({
        id: item.objectId,
        name: item.name,
        color: item.color,
        path: typeof item.path === 'string' ? JSON.parse(item.path) : item.path,
        createdat: new Date(item.createdAt).getTime()
      }));
    } catch (e) {
      console.error('获取区域数据失败:', JSON.stringify(e));
      alert('获取区域数据失败，请检查网络或联系管理员');
      return [];
    }
  },

  /**
   * 保存新区域，并自动绑定当前用户
   * @param {Object} area 区域对象
   */
  async saveArea(area) {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error("用户未登录，无法保存数据");
    }
    try {
      const query = Bmob.Query('DeliveryArea');
      query.set("name", area.name || '未命名区域');
      query.set("color", area.color || '#3b82f6');
      query.set("path", JSON.stringify(area.path || []));
      query.set("userId", user.objectId); // 核心：将数据与当前用户绑定

      const res = await query.save();
      
      return {
        id: res.objectId,
        name: area.name,
        color: area.color,
        path: area.path,
        userId: user.objectId,
        createdat: new Date(res.createdAt).getTime()
      };
    } catch (e) {
      console.error('保存区域数据失败:', JSON.stringify(e));
      throw e;
    }
  },

  /**
   * 删除指定区域
   * @param {string} id 区域ID
   */
  async deleteArea(id) {
    try {
      const query = Bmob.Query('DeliveryArea');
      await query.destroy(id);
    } catch (e) {
      console.error('删除区域数据失败:', e);
      throw e;
    }
  },

  /**
   * 更新指定区域
   * @param {string} id 区域ID
   * @param {Object} updates 更新的数据
   */
  async updateArea(id, updates) {
    try {
      const query = Bmob.Query('DeliveryArea');
      const res = await query.get(id); // 先获取到要更新的对象
      if (updates.name) res.set('name', updates.name);
      if (updates.color) res.set('color', updates.color);
      if (updates.path) res.set('path', JSON.stringify(updates.path));
      
      await res.save();
      return true;
    } catch (e) {
      console.error('更新区域数据失败:', e);
      throw e;
    }
  }
};

window.Store = Store;
