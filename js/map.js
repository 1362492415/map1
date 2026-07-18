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

    // 新增：手动绘制相关状态
    this.isDrawing = false;
    this.currentPath = [];
    this.tempPolyline = null;
    this.drawEndCallback = null;
    this.mapClickHandler = null;
    this.mapMouseMoveHandler = null; // 新增：鼠标移动事件
    this.snapMarker = null; // 新增：吸附提示点
    this.currentSnapPoint = null; // 新增：当前吸附的经纬度

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

    // 初始化吸附提示点
    this.snapMarker = new AMap.CircleMarker({
      map: this.map,
      center: [0, 0],
      radius: 6,
      fillColor: '#ef4444',
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      visible: false,
      zIndex: 999,
      bubble: true // 新增：允许事件冒泡到地图，防止红点阻挡点击事件
    });
  }

  /**
   * 开启绘制模式
   * @param {Function} onDrawEnd 绘制完成回调，接收 path 数组
   */
  startDraw(onDrawEnd) {
    if (this.isDrawing) return;

    this.isDrawing = true;
    this.currentPath = [];
    this.drawEndCallback = onDrawEnd; // 保存回调函数
    this.currentSnapPoint = null;

    // 更改地图光标样式
    this.map.getContainer().style.cursor = 'crosshair';

    // 创建临时折线
    this.tempPolyline = new AMap.Polyline({
      map: this.map,
      strokeColor: '#2563eb',
      strokeWeight: 2,
      strokeStyle: 'dashed',
    });

    // 收集所有已有区域的顶点，用于吸附计算
    const allVertices = [];
    this.polygons.forEach(polygon => {
      const path = polygon.getPath();
      path.forEach(p => {
        allVertices.push(p);
      });
    });

    // 绑定鼠标移动事件，实现吸附逻辑
    this.mapMouseMoveHandler = (e) => {
      if (!this.isDrawing) return;
      
      const mouseLngLat = e.lnglat;
      const mousePixel = this.map.lngLatToContainer(mouseLngLat);
      let snapped = false;
      const snapThreshold = 7; // 吸附阈值（像素），适配手机端防误触

      for (let i = 0; i < allVertices.length; i++) {
        const vertex = allVertices[i];
        const vertexPixel = this.map.lngLatToContainer(vertex);
        
        // 计算屏幕像素距离
        const distance = Math.sqrt(
          Math.pow(mousePixel.x - vertexPixel.x, 2) + 
          Math.pow(mousePixel.y - vertexPixel.y, 2)
        );

        if (distance < snapThreshold) {
          // 触发吸附
          this.currentSnapPoint = vertex;
          this.snapMarker.setCenter(vertex);
          this.snapMarker.show();
          snapped = true;
          break; // 找到一个吸附点就跳出
        }
      }

      if (!snapped) {
        this.currentSnapPoint = null;
        this.snapMarker.hide();
      }
    };

    // 绑定地图点击事件
    this.mapClickHandler = (e) => {
      // 如果当前有吸附点，则使用吸附点，否则使用鼠标实际点击点
      const pointToAdd = this.currentSnapPoint ? this.currentSnapPoint : e.lnglat;
      this.currentPath.push(pointToAdd);
      this.tempPolyline.setPath(this.currentPath);
    };

    this.map.on('mousemove', this.mapMouseMoveHandler);
    this.map.on('click', this.mapClickHandler);
  }

  /**
   * 完成绘制
   */
  finishDraw() {
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.map.getContainer().style.cursor = 'default';
    this.map.off('click', this.mapClickHandler); // 移除点击事件监听
    this.map.off('mousemove', this.mapMouseMoveHandler); // 移除鼠标移动监听
    this.snapMarker.hide();

    // 移除临时折线
    if (this.tempPolyline) {
      this.tempPolyline.setMap(null);
      this.tempPolyline = null;
    }

    // 触发回调，传递路径并进行裁剪处理
    if (typeof this.drawEndCallback === 'function' && this.currentPath.length >= 3) {
      let path = this.currentPath.map(p => [p.lng, p.lat]);
      
      // 确保多边形闭合 (首尾点相同)
      if (path[0][0] !== path[path.length - 1][0] || path[0][1] !== path[path.length - 1][1]) {
        path.push([...path[0]]);
      }

      try {
        // 构建新绘制区域的 Turf 多边形对象
        let newPolygon = turf.polygon([path]);

        // 遍历所有已有区域，依次进行“减法”（裁剪重叠部分）
        this.polygons.forEach(polygon => {
          const existingPath = polygon.getPath().map(p => [p.lng, p.lat]);
          if (existingPath.length < 3) return;
          
          // 确保已有区域闭合
          if (existingPath[0][0] !== existingPath[existingPath.length - 1][0] || existingPath[0][1] !== existingPath[existingPath.length - 1][1]) {
            existingPath.push([...existingPath[0]]);
          }
          
          const existingTurfPolygon = turf.polygon([existingPath]);
          
          // 执行差集计算：newPolygon - existingTurfPolygon
          const diff = turf.difference(newPolygon, existingTurfPolygon);
          
          if (diff) {
            // 如果裁剪后是一个完整的多边形 (Polygon)
            if (diff.geometry.type === 'Polygon') {
              newPolygon = diff;
            } 
            // 如果裁剪后被分成了多个碎块 (MultiPolygon)，我们取面积最大的那一块
            else if (diff.geometry.type === 'MultiPolygon') {
              let maxArea = 0;
              let maxPoly = null;
              diff.geometry.coordinates.forEach(coords => {
                const poly = turf.polygon(coords);
                const area = turf.area(poly);
                if (area > maxArea) {
                  maxArea = area;
                  maxPoly = poly;
                }
              });
              if (maxPoly) newPolygon = maxPoly;
            }
          } else {
            // diff 为 null 说明新区域完全被老区域包围/覆盖了，直接被剪没了
            console.warn("新绘制的区域完全被现有区域覆盖");
            newPolygon = null;
          }
        });

        if (newPolygon) {
          // 将 Turf 多边形坐标转回高德需要的格式 (去掉自动补全的尾点，高德API不需要首尾相同)
          let finalPath = newPolygon.geometry.coordinates[0];
          finalPath.pop(); // 移除首尾重复点
          this.drawEndCallback(finalPath);
        } else {
          alert("绘制失败：您绘制的区域已完全存在于其他区域中！");
          this.drawEndCallback(null); // 传递 null 表示失败
        }

      } catch (err) {
        console.error("重叠裁剪计算失败:", err);
        // 如果裁剪失败（可能因为画了自相交的复杂多边形），降级返回原始路径
        path.pop(); // 移除为了 Turf 补上的尾点
        this.drawEndCallback(path);
      }
    }

    this.currentPath = [];
    this.drawEndCallback = null;
  }

  /**
   * 取消绘制
   */
  cancelDraw() {
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.map.getContainer().style.cursor = 'default';
    this.map.off('click', this.mapClickHandler);
    this.map.off('mousemove', this.mapMouseMoveHandler);
    this.snapMarker.hide();

    if (this.tempPolyline) {
      this.tempPolyline.setMap(null);
      this.tempPolyline = null;
    }

    this.currentPath = [];
    this.drawEndCallback = null;
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