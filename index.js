window.onload = function() {
  const { body } = document;
  const mdImg = document.getElementById('mdImg');
  const barImg = document.getElementById('barImg');
  const BUILDING_TYPES = {
    md: {
      img: mdImg,
      mu: x => 1 / x,
      T: 1,
    },
    bar: {
      img: barImg,
      mu: x => 1 / x,
      T: 7,
    },
    house: {
      mu: x => 7 / x,
      T: 1,
    }
  };
  const BUILDING_TYPE_NAMES = Object.keys(BUILDING_TYPES);
  const canvas = document.createElement('canvas');
  canvas.width = '650';
  canvas.height = '400';
  body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const field = new Field();
  
  const animationPeriod = 33;
  let lastTime = Date.now();;
  let frameIndex = 0;
  window.requestAnimationFrame(tick);

  function tick() {
    const nowDate = Date.now();
    const dt = nowDate - lastTime;
    if (dt > animationPeriod) {
      for (let human of field.humans) {
        human.move(dt);
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setLineDash([]);
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      field.draw();
      lastTime = nowDate;
      frameIndex++;
    }
    window.requestAnimationFrame(tick);
  }

  function generateColor() {
    let r = Math.floor(Math.random() * 256);
    let g = Math.floor(Math.random() * 256);
    let b = Math.floor(Math.random() * 256);
    while (r + g + b < 128 || r + g + b > 760) {
      r = Math.floor(Math.random() * 256);
      g = Math.floor(Math.random() * 256);
      b = Math.floor(Math.random() * 256);
    }
    return '#' + (r * 65536 + g * 256 + b).toString(16);
  }

  function Human(field, x, y) {
    this.x = x;
    this.y = y;
    this.house = null;
    this.drawingX = this.x;
    this.drawingY = this.y;
    this.walking = false;
    this.nextX = null;
    this.nextY = null;
    this.walkingPath = null;
    this.hasTarget = false;
    this.targetX = null;
    this.targetY = null;
    this.field = field;
    this.color = generateColor();
    this.startMoving = function(toX, toY) {
      this.walkingPath = this.calcWalkingPath(toX, toY);
      const { walkingPath } = this;
      if (walkingPath && walkingPath.length > 0) {
        this.walking = true;
        const [newX, newY] = walkingPath[walkingPath.length - 1];
        this.nextX = newX;
        this.nextY = newY;
        this.doNextStep();
      }
    };

    this.doNextStep = function() {
      this.hasTarget = true;
      this.targetX = this.walkingPath[0][0];
      this.targetY = this.walkingPath[0][1];
      this.walkingPath.shift();
    };

    const speed = 0.001;
    this.move = function(dt) {
      if (this.hasTarget) {
        const dx = this.targetX - this.drawingX;
        const dy = this.targetY - this.drawingY;
        const dr = Math.sqrt(dx * dx + dy * dy);
        if (speed * dt < dr) {
          this.drawingX += speed * dt * dx / dr;
          this.drawingY += speed * dt * dy / dr;
        } else {
          this.x = this.targetX;
          this.y = this.targetY;
          this.hasTarget = false;
          if (this.walkingPath.length > 0) {
            this.doNextStep();
          } else {
            this.walking = false;
            this.nextTarget();
          }
        }
      }
    };

    this.nextTarget = function() {
      const choice = randInt(3);
      let targetBuilding;
      const { md, bar } = field.buildings;
      switch (choice) {
        case 0: {
          targetBuilding = md[randInt(md.length)];
        } break;
        case 1: {
          targetBuilding = bar[randInt(bar.length)];
        } break;
        case 2: {
          targetBuilding = this.house;
        } break;
      }
      if (targetBuilding) {
        const { x, y } = targetBuilding;
        this.startMoving(x, y);
      }
    };

    this.calcWalkingPath = function(toX, toY) {
      let walkingPath = null;
      switch (field.cells[toY][toX].type) {
        case 0: {
          [walkingPath] = bfs(field.cells, this.x, this.y,
            cell => cell.type === 0,
            (x, y) => x === toX && y === toY
          );
        } break;
        case 1: {
          [closestEmptyPath] = bfs(field.cells, toX, toY,
            cell => true,
            (x, y) => field.cells[y][x].type === 0
          );
          if (closestEmptyPath && closestEmptyPath.length > 0) {
            const [closeX, closeY] =
              closestEmptyPath[closestEmptyPath.length - 1];
            walkingPath = this.calcWalkingPath(closeX, closeY);
          }
        } break;
      }
      return walkingPath;
    }
  }

  function randomCoord(width, height) {
    let x = Math.floor(Math.random() * width);
    let y = Math.floor(Math.random() * height);
    return [x, y];
  }

  function Field() {
    const border = 2;
    this.x = 10;
    this.y = 10;
    this.width = 630;
    this.height = 378;
    this.cellsWidth = 25;
    this.cellsHeight = 16;
    this.cellWidth = this.width / this.cellsWidth;
    this.cellHeight = this.height / this.cellsHeight;
    this.cells = generateCells(this.cellsWidth, this.cellsHeight);
    this.humans = generateHumans(this);
    this.buildings = generateBuildings(this);
    const houseColorChangePeriod = 1000;
    this.draw = function() {
      const field = this;
      for (let i = 0; i < this.cellsHeight; i++) {
        for (let j = 0; j < this.cellsWidth; j++) {
          switch (this.cells[i][j].type) {
            case 0: {
              ctx.setLineDash([1, 3]);
              ctx.beginPath();
              [[-1, 0], [0, -1], [0, 1], [1, 0]].forEach(([di, dj]) => {
                const newI = i + di;
                if (newI < 0 || newI >= this.cellsHeight)
                  return;
                const newJ = j + dj;
                if (newJ < 0 || newJ >= this.cellsWidth)
                  return;
                if (this.cells[i + di][j + dj].type === 0) {
                  ctx.moveTo(localX(j + 0.5), localY(i + 0.5));
                  ctx.lineTo(localX(j + 0.5 + dj), localY(i + 0.5 + di));
                }
              });
              ctx.stroke();
            } break;
            case 1: {
              ctx.setLineDash([]);
              ctx.beginPath();
              const { building } = this.cells[i][j];
              if (building) {
                if (building.type !== 'house') {
                  ctx.drawImage(BUILDING_TYPES[building.type].img,
                    localX(j) + 2 * border,
                    localY(i) + 2 * border,
                    this.cellWidth - 4 * border,
                    this.cellHeight - 4 * border);
                } else {
                  const { humans } = building;
                  const houseIndex = Math.floor(Date.now() / houseColorChangePeriod)
                                   % humans.length;
                  ctx.fillStyle = humans[houseIndex].color;
                  ctx.fillRect(localX(j) + border,
                    localY(i) + border,
                    this.cellWidth - 2 * border,
                    this.cellHeight - 2 * border);
                }
              }
              ctx.strokeRect(localX(j) + border,
                localY(i) + border,
                this.cellWidth - 2 * border,
                this.cellHeight - 2 * border);
              ctx.stroke();
            } break;
          }
        }
      }
      ctx.stroke();
      for (let human of field.humans) {
        ctx.beginPath();
        ctx.fillStyle = human.color;
        ctx.arc(localX(human.drawingX + 0.5), localY(human.drawingY + 0.5), 5, 0, 2 * Math.PI);
        ctx.fill();
      }

      function localX(x) {
        return field.x + x * field.cellWidth;
      }

      function localY(y) {
        return field.y + y * field.cellHeight;
      }

    };

    function generateBuildings(field) {
      const { humans } = field;
      const mds = generateTypeBuildings(field, 'md', 5);
      const bars = generateTypeBuildings(field, 'bar', 5);
      const houses = generateHouses(field, humans);
      const buildings = [].concat(mds, bars, houses);
      buildings.md = mds;
      buildings.bar = bars;
      buildings.house = houses;
      return buildings;
    }

    function generateBuildingsGeneral(field, type, count, condition) {
      const { cellsHeight, cellsWidth } = field;
      const buildings = new Array(count);
      for (let i = 0; i < count; i++) {
        let [x, y] = randomCoord(cellsWidth, cellsHeight);
        while (!condition(x, y)) {
          [x, y] = randomCoord(cellsWidth, cellsHeight);
        }
        buildings[i] = { type, x, y };
      }
      return buildings;
    }

    function generateTypeBuildings(field, type, count) {
      const buildings = generateBuildingsGeneral(field, type, count, (x, y) =>
        field.cells[y][x].type === 1 &&
        !field.cells[y][x].building
      );
      buildings.forEach(building => {
        const { x, y } = building;
        field.cells[y][x].building = building;
      });
      return buildings;
    }

    function generateHouses(field, humans) {
      const { cells } = field;
      return generateBuildingsGeneral(field, 'house', humans.length,
        (x, y) => cells[y][x].type === 1
               && ( !cells[y][x].building
                 || cells[y][x].building.type === 'house')
      ).map((building, i) => {
        const { x, y } = building;
        if (field.cells[y][x].building === undefined) {
          building.humans = [humans[i]];
          field.cells[y][x].building = building;
        } else {
          field.cells[y][x].building.humans.push(humans[i]);
        }
        humans[i].house = field.cells[y][x].building;
        humans[i].startMoving(x, y);
      });
    }

    function generateHumans(field) {
      const { cellsWidth, cellsHeight } = field;
      const humans = new Array(10);
      for (let i = 0; i < humans.length; i++) {
        let [x, y] = randomCoord(cellsWidth, cellsHeight);
        while (field.cells[y][x].type !== 0) {
          [x, y] = randomCoord(cellsWidth, cellsHeight);          
        }
        humans[i] = new Human(field, x, y);
      }
      return humans;
    }
    
    function generateCells(width, height) {
      const cells = new Array(height);
      for (let i = 0; i < height; i++) {
        cells[i] = new Array(width);
        for (let j = 0; j < width; j++) {
          const type = i % 3 === 0 || j % 6 === 0 ? 0 : 1;
          cells[i][j] = { type };
        }
      }
      return cells;
    }
  }

  function bfs(cells, startX, startY, isGoodNext, isGood) {
    if (isGood(startX, startY)) return [];
    const bfs = new Array(cells.length);
    for (let i = 0; i < bfs.length; i++) {
      bfs[i] = new Array(cells[i].length);
    }
    bfs[startY][startX] = 0;
    let newCells = [[startX, startY]];
    let index = 0;
    let res = [];
    while (newCells.length > 0 && res.length === 0) {
      index++;
      const newNewCells = [];
      for (let cell of newCells) {
        const [x, y] = cell;
        [[-1, 0], [0, -1], [0, 1], [1, 0]].forEach(([dx, dy]) => {
          const newX = x + dx;
          if (newX < 0 || newX >= cells[0].length)
            return;
          const newY = y + dy;
          if (newY < 0 || newY >= cells.length)
            return;
          if (bfs[newY][newX] === undefined && isGoodNext(cells[newY][newX])) {
            bfs[newY][newX] = cell;
            newNewCells.push([newX, newY]);
            if (isGood(newX, newY)) {
              const walkingPath = [[newX, newY]];
              let nextX = newX;
              let nextY = newY;
              for (let i = 0; i < index; i++) {
                const nextCell = bfs[nextY][nextX];
                walkingPath.unshift(nextCell);
                [nextX, nextY] = nextCell;
              }
              res.push(walkingPath);
            }
          }
        });
      }
      newCells = newNewCells;
    }
    return res;
  };

  function randInt(maxValue) {
    return Math.floor(Math.random() * maxValue);
  }
};


