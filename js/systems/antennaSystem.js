/**
 * Antenna System
 * 天线接收系统 - 检测和接收反弹波
 */

class AntennaSystem {
    constructor() {
        // 天线参数（跟随玩家）
        this.direction = 0;  // 天线方向（弧度，跟随鼠标）
        this.range = 280;    // 接收半径
        this.angle = Math.PI / 2.5;  // 扇形角度
        
        // 接收记录
        this.receivedReflections = [];  // 当前帧接收到的反弹波
        this.reflectionHistory = [];    // 历史记录（用于统计和显示）
        
        // 性能优化：限制处理的波纹数量
        this.maxHistorySize = 1000;

        // 性能优化：缓存当前帧天线范围内的所有波纹，供其他系统复用
        // 例如：RadioSystem 瀑布图、信号源发现逻辑等
        this.lastWavesInRange = [];
    }
    
    /**
     * 更新天线方向（跟随玩家朝向/鼠标）
     * @param {number} angle - 角度（弧度）
     */
    updateDirection(angle) {
        this.direction = angle;
    }
    
    /**
     * 检测天线范围内的反弹波
     * @param {array} allWaves - 所有波纹数组
     * @param {number} playerX - 玩家X坐标
     * @param {number} playerY - 玩家Y坐标
     * @returns {array} 检测到的反弹波数组
     */
    detectReflectedWaves(allWaves, playerX, playerY) {
        // 清空当前帧的接收记录
        this.receivedReflections = [];
        this.lastWavesInRange = [];
        
        if (!allWaves || allWaves.length === 0) return [];
        
        // 遍历所有波纹，找出天线范围内的波纹（缓存），并从中筛选反弹波
        for (const wave of allWaves) {
            // 检查距离（波纹中心到玩家的距离）
            const dx = wave.x - playerX;
            const dy = wave.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 检查波纹是否在天线范围内（考虑波纹半径）
            // 如果波纹的任何部分在天线范围内，就认为被接收
            const waveMinDist = Math.max(0, distance - wave.r);  // 波纹最近边缘到玩家的距离
            const waveMaxDist = distance + wave.r;  // 波纹最远边缘到玩家的距离
            
            // 波纹是否与天线范围有交集
            if (waveMinDist > this.range) continue;  // 波纹完全在天线范围外
            
            // 检查角度：波纹是否在扇形范围内
            const angleToWave = Math.atan2(dy, dx);
            const angleDiff = this.normalizeAngle(angleToWave - this.direction);
            
            // 对于扇形检测，需要考虑波纹的扩散角度
            // 简化：如果波纹中心在扇形内，或者波纹扩散角度与扇形有交集
            const waveSpread = wave.spread || 0;
            const waveStartAngle = wave.angle - waveSpread / 2;
            const waveEndAngle = wave.angle + waveSpread / 2;
            
            // 检查波纹角度范围是否与天线扇形有交集
            const antennaStartAngle = this.direction - this.angle / 2;
            const antennaEndAngle = this.direction + this.angle / 2;
            
            let angleOverlap = false;
            // 简化检测：如果波纹中心角度在扇形内，或者波纹角度范围与扇形有交集
            if (Math.abs(angleDiff) <= this.angle / 2) {
                angleOverlap = true;
            } else if (waveSpread > Math.PI) {
                // 全向波，总是有交集
                angleOverlap = true;
            }
            
            if (!angleOverlap) continue;

            // 记录所有在天线范围内的波纹，供其他系统（无线电瀑布图、信号源发现等）复用
            this.lastWavesInRange.push(wave);
            
            // === 只处理反弹波：记录碰撞点到SLAM ===
            if (wave.isReflectedWave) {
                // 如果反弹波有碰撞点队列，使用队列；否则使用单个起点
                const collisionPoints = wave.collisionPoints || [{
                    x: wave.reflectionOriginX || wave.x,
                    y: wave.reflectionOriginY || wave.y
                }];
                
                const reflection = {
                    wave: wave,
                    distance: distance,
                    angle: angleToWave,
                    timestamp: Date.now(),
                    // 碰撞点队列（所有被阻挡的碰撞点）
                    collisionPoints: collisionPoints
                };
                
                this.receivedReflections.push(reflection);
                
                // 标记波纹已被接收（避免重复处理）
                if (!wave._receivedByAntenna) {
                    wave._receivedByAntenna = true;
                    this.recordToHistory(reflection);
                }
            }
            
            // === 所有波纹（包括反弹波）：记录到无线电系统用于瀑布图显示 ===
            // 这部分将在阶段五实现
        }
        
        return this.receivedReflections;
    }
    
    /**
     * 记录反弹波到历史
     * @param {object} reflection - 反弹波记录
     */
    recordToHistory(reflection) {
        this.reflectionHistory.push(reflection);
        
        // 限制历史大小
        if (this.reflectionHistory.length > this.maxHistorySize) {
            this.reflectionHistory.shift();
        }
    }
    
    /**
     * 获取最近接收到的反弹波
     * @param {number} limit - 返回数量限制
     * @returns {array} 反弹波数组
     */
    getRecentReflections(limit = 10) {
        return this.reflectionHistory.slice(-limit);
    }
    
    /**
     * 规范化角度到 [-PI, PI] 范围
     * @param {number} angle - 角度（弧度）
     * @returns {number} 规范化后的角度
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
    
    /**
     * 清空历史记录
     */
    clearHistory() {
        this.reflectionHistory = [];
    }
    
    /**
     * 检查某个点是否在天线范围内
     * @param {number} x - 点的X坐标
     * @param {number} y - 点的Y坐标
     * @param {number} playerX - 玩家X坐标
     * @param {number} playerY - 玩家Y坐标
     * @returns {boolean} 是否在范围内
     */
    isInRange(x, y, playerX, playerY) {
        const dx = x - playerX;
        const dy = y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.range) return false;
        
        const angleToPoint = Math.atan2(dy, dx);
        const angleDiff = this.normalizeAngle(angleToPoint - this.direction);
        
        return Math.abs(angleDiff) <= this.angle / 2;
    }
}

// 创建全局实例
let antennaSystem = null;

/**
 * 初始化天线系统
 */
function initAntennaSystem() {
    antennaSystem = new AntennaSystem();
    console.log('Antenna System initialized');
    return antennaSystem;
}

