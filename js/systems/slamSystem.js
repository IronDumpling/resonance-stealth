/**
 * SLAM System
 * 点云地图系统 - 记录天线接收到的反弹波碰撞点
 */

class SLAMSystem {
    constructor() {
        // 点云存储
        this.pointCloud = [];  // 存储格式：{x, y, timestamp, type, waveId}
        this.maxPoints = 10000;  // 点云上限
        
        // 空间分区优化（将地图划分为网格）
        this.gridSize = 100;  // 网格大小（像素）
        this.grid = new Map();  // 格式：key="x,y" -> [points]
        
        // 点的生命周期（永久记录，但可以选择性清除旧点）
        this.pointLifetime = Infinity;
        
        // 统计信息
        this.stats = {
            totalPoints: 0,
            wallPoints: 0,
            enemyPoints: 0,
            playerPoints: 0
        };
    }
    
    /**
     * 添加新的扫描点
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {string} type - 点类型：'wall', 'enemy', 'player', 'unknown'
     * @param {string} waveId - 波纹ID（用于去重）
     */
    addPoint(x, y, type = 'unknown', waveId = null) {
        // 去重：检查是否已存在相同位置的点（允许一定误差）
        if (this.hasNearbyPoint(x, y, 5)) {
            return false;  // 附近已有点，不重复添加
        }
        
        const point = {
            x: x,
            y: y,
            timestamp: Date.now(),
            type: type,
            waveId: waveId
        };
        
        // 添加到点云
        this.pointCloud.push(point);
        
        // 添加到空间网格
        this.addToGrid(point);
        
        // 更新统计
        this.stats.totalPoints++;
        if (type === 'wall') this.stats.wallPoints++;
        else if (type === 'enemy') this.stats.enemyPoints++;
        else if (type === 'player') this.stats.playerPoints++;
        
        // 检查是否超出上限
        if (this.pointCloud.length > this.maxPoints) {
            const removed = this.pointCloud.shift();
            this.removeFromGrid(removed);
            this.stats.totalPoints--;
        }
        
        return true;
    }
    
    /**
     * 从天线接收的反弹波批量添加点
     * @param {array} reflections - 反弹波数组（来自antennaSystem）
     */
    addPointsFromReflections(reflections) {
        if (!reflections || reflections.length === 0) return;
        
        reflections.forEach(reflection => {
            // 处理碰撞点队列（所有被阻挡的碰撞点）
            const collisionPoints = reflection.collisionPoints || [];
            
            if (collisionPoints.length === 0) return;
            
            // 根据反弹波的ownerId判断点的类型
            let pointType = 'unknown';
            if (reflection.wave.isReflectedWave) {
                const ownerId = reflection.wave.ownerId;
                if (ownerId === 'wall') {
                    pointType = 'wall';
                } else if (ownerId === 'player') {
                    pointType = 'player';
                } else if (ownerId) {
                    pointType = 'enemy';
                } else {
                    pointType = 'unknown';
                }
            }
            
            // 批量添加所有碰撞点
            collisionPoints.forEach((point, index) => {
                this.addPoint(
                    point.x,
                    point.y,
                    pointType,
                    `${reflection.wave.id}_${index}`  // 为每个点生成唯一ID
                );
            });
        });
    }
    
    /**
     * 检查附近是否已有点
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} threshold - 距离阈值
     * @returns {boolean} 是否存在近邻点
     */
    hasNearbyPoint(x, y, threshold) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        
        // 检查当前格子和相邻8个格子
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${gridX + dx},${gridY + dy}`;
                const gridPoints = this.grid.get(key);
                
                if (gridPoints) {
                    for (const point of gridPoints) {
                        const dist = Math.hypot(point.x - x, point.y - y);
                        if (dist < threshold) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * 添加点到空间网格
     * @param {object} point - 点对象
     */
    addToGrid(point) {
        const gridX = Math.floor(point.x / this.gridSize);
        const gridY = Math.floor(point.y / this.gridSize);
        const key = `${gridX},${gridY}`;
        
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        
        this.grid.get(key).push(point);
    }
    
    /**
     * 从空间网格移除点
     * @param {object} point - 点对象
     */
    removeFromGrid(point) {
        const gridX = Math.floor(point.x / this.gridSize);
        const gridY = Math.floor(point.y / this.gridSize);
        const key = `${gridX},${gridY}`;
        
        const gridPoints = this.grid.get(key);
        if (gridPoints) {
            const index = gridPoints.indexOf(point);
            if (index !== -1) {
                gridPoints.splice(index, 1);
            }
            
            // 如果格子空了，删除这个格子
            if (gridPoints.length === 0) {
                this.grid.delete(key);
            }
        }
    }
    
    /**
     * 获取某区域的点云（用于渲染）
     * @param {number} centerX - 中心X坐标
     * @param {number} centerY - 中心Y坐标
     * @param {number} radius - 半径
     * @returns {array} 点云数组
     */
    getPointsInRegion(centerX, centerY, radius) {
        const points = [];
        const radiusSq = radius * radius;
        
        // 计算需要检查的网格范围
        const minGridX = Math.floor((centerX - radius) / this.gridSize);
        const maxGridX = Math.floor((centerX + radius) / this.gridSize);
        const minGridY = Math.floor((centerY - radius) / this.gridSize);
        const maxGridY = Math.floor((centerY + radius) / this.gridSize);
        
        // 遍历相关网格
        for (let gx = minGridX; gx <= maxGridX; gx++) {
            for (let gy = minGridY; gy <= maxGridY; gy++) {
                const key = `${gx},${gy}`;
                const gridPoints = this.grid.get(key);
                
                if (gridPoints) {
                    for (const point of gridPoints) {
                        const dx = point.x - centerX;
                        const dy = point.y - centerY;
                        const distSq = dx * dx + dy * dy;
                        
                        if (distSq <= radiusSq) {
                            points.push(point);
                        }
                    }
                }
            }
        }
        
        return points;
    }
    
    /**
     * 获取所有点云（用于全图渲染）
     * @returns {array} 所有点云
     */
    getAllPoints() {
        return this.pointCloud;
    }
    
    /**
     * 清除所有点云
     */
    clear() {
        this.pointCloud = [];
        this.grid.clear();
        this.stats = {
            totalPoints: 0,
            wallPoints: 0,
            enemyPoints: 0,
            playerPoints: 0
        };
    }
    
    /**
     * 清除指定类型的点
     * @param {string} type - 点类型
     */
    clearType(type) {
        this.pointCloud = this.pointCloud.filter(p => {
            if (p.type === type) {
                this.removeFromGrid(p);
                this.stats.totalPoints--;
                if (type === 'wall') this.stats.wallPoints--;
                else if (type === 'enemy') this.stats.enemyPoints--;
                else if (type === 'player') this.stats.playerPoints--;
                return false;
            }
            return true;
        });
    }
    
    /**
     * 清除过期的点（如果设置了生命周期）
     */
    clearExpiredPoints() {
        if (this.pointLifetime === Infinity) return;
        
        const now = Date.now();
        const expiredTime = now - this.pointLifetime;
        
        this.pointCloud = this.pointCloud.filter(p => {
            if (p.timestamp < expiredTime) {
                this.removeFromGrid(p);
                this.stats.totalPoints--;
                return false;
            }
            return true;
        });
    }
    
    /**
     * 获取统计信息
     * @returns {object} 统计数据
     */
    getStats() {
        return { ...this.stats };
    }
}

// 创建全局实例
let slamSystem = null;

/**
 * 初始化SLAM系统
 */
function initSLAMSystem() {
    slamSystem = new SLAMSystem();
    console.log('SLAM System initialized');
    return slamSystem;
}

