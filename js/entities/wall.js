/**
 * 墙壁实体系统 (Wall Entity System)
 */

// 创建墙壁
function spawnWall(x, y, w, h, blockFreq, color) {
    const wall = {
        x: x,
        y: y,
        w: w,
        h: h,
        blockFreq: blockFreq,  // 阻挡频率（高于此频率的wave会被反弹）
        color: color || '#888', // 墙壁颜色
        absorbedEnergy: 0       // 吸收的能量（用于显示）
    };
    
    return wall;
}

// 生成随机墙壁
function spawnRandomWall() {
    const mapWidth = canvas.width * CFG.mapScale;
    const mapHeight = canvas.height * CFG.mapScale;
    
    const w = rand(80, 200);
    const h = rand(80, 200);
    const x = rand(100, mapWidth - 200);
    const y = rand(100, mapHeight - 200);
    
    // 检查与其他墙壁重叠
    let overlap = false;
    for (const other of state.entities.walls) {
        if (x < other.x + other.w + 20 && x + w + 20 > other.x && 
            y < other.y + other.h + 20 && y + h + 20 > other.y) {
            overlap = true;
            break;
        }
    }
    
    // 检查与出生点重叠
    if (!overlap) {
        const px = mapWidth / 2;
        const py = mapHeight / 2;
        if (x < px + 150 && x + w > px - 150 && y < py + 150 && y + h > py - 150) {
            overlap = true;
        }
    }
    
    if (overlap) {
        return null;
    }
    
    const blockFreq = CFG.wallFreqs[Math.floor(Math.random() * CFG.wallFreqs.length)];
    const color = CFG.wallColors[blockFreq];
    
    return spawnWall(x, y, w, h, blockFreq, color);
}

// 生成边界墙
function spawnBorderWalls() {
    const borderThickness = 60;
    const mapWidth = canvas.width * CFG.mapScale;
    const mapHeight = canvas.height * CFG.mapScale;
    const borderFreq = CFG.wallFreqs[CFG.wallFreqs.length - 1]; // 使用最高频率作为边界阻挡
    const borderColor = CFG.wallColors[borderFreq];
    
    const walls = [];
    
    // 上边界
    walls.push(spawnWall(
        -borderThickness, -borderThickness,
        mapWidth + borderThickness * 2, borderThickness,
        borderFreq, borderColor
    ));
    
    // 下边界
    walls.push(spawnWall(
        -borderThickness, mapHeight,
        mapWidth + borderThickness * 2, borderThickness,
        borderFreq, borderColor
    ));
    
    // 左边界
    walls.push(spawnWall(
        -borderThickness, 0,
        borderThickness, mapHeight,
        borderFreq, borderColor
    ));
    
    // 右边界
    walls.push(spawnWall(
        mapWidth, 0,
        borderThickness, mapHeight,
        borderFreq, borderColor
    ));
    
    return walls;
}

// 初始化墙壁系统
function initWalls() {
    state.entities.walls = [];
    
    // 生成边界墙
    const borderWalls = spawnBorderWalls();
    state.entities.walls.push(...borderWalls);
    
    // 生成随机墙壁
    let attempts = 0;
    const numWalls = CFG.numWalls;
    while (state.entities.walls.length < numWalls && attempts < 500) {
        attempts++;
        const wall = spawnRandomWall();
        if (wall) {
            state.entities.walls.push(wall);
        }
    }
    
    console.log(`Initialized ${state.entities.walls.length} walls`);
}

