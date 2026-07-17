/**
 * 地图交互核心逻辑模块
 */

class MapManager {
  constructor(containerId) {
    this.map = null;
    this.mouseTool = null;
    this.geocoder = null;
    this.polygons = new Map(); // 存储已绘制的多边形实例 (id -> polygon)
    this.marker = null; // 用于搜索结果的高亮打点

    this.initMap(containerId);
  }

  initMap(containerId) {
    // 初始化地图，中心点设为东莞市附近
    this.map = new AMap.Map(containerId, {
      zoom: 13,
      center: [113.75179, 23.02067], // 东莞市中心坐标
      viewMode: '2D',
      mapStyle: 'amap://styles/whitesmoke', // 使用工业风清亮底图
    });

    // 初始化插件
    this.map.plugin(['AMap.MouseTool', 'AMap.Geocoder'], () => {
      this.mouseTool = new AMap.MouseTool(this.map);
      this.geocoder = new AMap.Geocoder({
        city: '东莞', // 默认城市设为东莞
      });
    });

    // 初始化标记点（隐藏状态）
    this.marker = new AMap.Marker({
      map: this.map,
      visible: false
    });
  }

  /**
   * 开启绘制模式
   * @param {Function} onDrawEnd 绘制完成回调，接收 path 数组
   */
  startDraw(onDrawEnd) {
    if (!this.mouseTool) return;
    
    // 配置绘制多边形的样式
    this.mouseTool.polygon({
      fillColor: '#3b82f6',
      fillOpacity: 0.3,
      strokeColor: '#2563eb',
      strokeWeight: 2,
    });

    // 绑定绘制完成事件
    this.mouseTool.on('draw', (e) => {
      const polygon = e.obj;
      const path = polygon.getPath().map(p => [p.lng, p.lat]);
      
      // 触发回调
      if (typeof onDrawEnd === 'function') {
        onDrawEnd(path);
      }
      
      // 关闭绘制并清除临时多边形（由外部决定是否真正渲染保存后的多边形）
      this.mouseTool.close(true); 
    });
  }

  /**
   * 取消绘制
   */
  cancelDraw() {
    if (this.mouseTool) {
      this.mouseTool.close(true); // true 表示清除正在绘制的图形
    }
  }

  /**
   * 渲染多个区域多边形
   * @param {Array} areas 区域数据数组
   */
  renderAreas(areas) {
    // 清除现有多边形
    this.polygons.forEach(p => p.setMap(null));
    this.polygons.clear();

    areas.forEach(area => {
      const polygon = new AMap.Polygon({
        path: area.path,
        fillColor: area.color,
        fillOpacity: 0.3,
        strokeColor: area.color,
        strokeWeight: 2,
        map: this.map,
        extData: { id: area.id, name: area.name } // 附加数据
      });

      // 绑定点击事件，用于交互反馈
      polygon.on('click', () => {
        if (window.App) window.App.highlightArea(area.id);
      });

      this.polygons.set(area.id, polygon);
    });
  }

  /**
   * 高亮指定区域
   * @param {string} id 区域ID
   */
  highlightPolygon(id) {
    this.polygons.forEach((polygon, pid) => {
      if (pid === id) {
        polygon.setOptions({ fillOpacity: 0.6, strokeWeight: 3 });
        this.map.setFitView([polygon]); // 自动缩放视野到该多边形
      } else {
        polygon.setOptions({ fillOpacity: 0.3, strokeWeight: 2 });
      }
    });
  }

  /**
   * 地址解析
   * @param {string} address 地址
   * @returns {Promise<[number, number]>} 经纬度
   */
  geocode(address) {
    return new Promise((resolve, reject) => {
      if (!this.geocoder) return reject('Geocoder 未初始化');
      
      this.geocoder.getLocation(address, (status, result) => {
        if (status === 'complete' && result.info === 'OK') {
          const loc = result.geocodes[0].location;
          resolve([loc.lng, loc.lat]);
        } else {
          reject('解析地址失败');
        }
      });
    });
  }

  /**
   * 判断坐标点是否在多边形内
   * @param {Array} point [lng, lat]
   * @param {Array} areas 区域数据数组
   * @returns {Object|null} 所属区域对象
   */
  findAreaByPoint(point, areas) {
    if (!AMap.GeometryUtil) return null;
    
    for (let area of areas) {
      const isInside = AMap.GeometryUtil.isPointInRing(point, area.path);
      if (isInside) return area;
    }
    return null;
  }

  /**
   * 在地图上打点
   * @param {Array} point [lng, lat]
   */
  setMarker(point) {
    this.marker.setPosition(point);
    this.marker.show();
    this.map.setCenter(point);
  }
}

window.MapManager = MapManager;