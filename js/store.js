/**
 * 数据存储模块 (Bmob 后端云 API)
 * 负责与 Bmob 数据库的交互，实现多端数据同步。
 */

// 初始化 Bmob
Bmob.initialize("59ace789cc8c71536a050994beb12e0f", "d31f654ff30cf57f2d2b51ca4f87d8d2");

const Store = {
  /**
   * 获取所有区域
   * @returns {Promise<Array>} DeliveryArea 数组
   */
  async fetchAreas() {
    try {
      const query = Bmob.Query("DeliveryArea");
      const res = await query.find();
      // Bmob 返回的数据直接是对象数组，需要把 path 从 JSON 字符串转回数组
      return res.map(item => ({
        id: item.objectId, // Bmob 自动生成的 ID 字段名是 objectId
        name: item.name,
        color: item.color,
        path: typeof item.path === 'string' ? JSON.parse(item.path) : item.path,
        createdat: new Date(item.createdAt).getTime() // Bmob 自动生成的 createdAt 是日期字符串
      }));
    } catch (e) {
      console.error('获取区域数据失败:', e);
      return [];
    }
  },

  /**
   * 保存新区域
   * @param {Object} area 区域对象
   */
  async saveArea(area) {
    try {
      const query = Bmob.Query('DeliveryArea');
      query.set("name", area.name || '未命名区域');
      query.set("color", area.color || '#3b82f6');
      // Bmob 存复杂数组最稳妥的方式是转成 JSON 字符串
      query.set("path", JSON.stringify(area.path || []));
      
      const res = await query.save();
      
      return {
        id: res.objectId,
        name: area.name,
        color: area.color,
        path: area.path,
        createdat: new Date(res.createdAt).getTime()
      };
    } catch (e) {
      console.error('保存区域数据失败:', e);
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
      if (updates.name) query.set('name', updates.name);
      if (updates.color) query.set('color', updates.color);
      if (updates.path) query.set('path', JSON.stringify(updates.path));
      
      await query.set('objectId', id);
      await query.save();
    } catch (e) {
      console.error('更新区域数据失败:', e);
      throw e;
    }
  }
};

window.Store = Store;
