window.onload = function() {
  const { body } = document;
  const canvas = document.createElement('canvas');
  canvas.width = '650';
  canvas.height = '480';
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
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      field.draw();
      lastTime = nowDate;
      frameIndex++;
    }
    window.requestAnimationFrame(tick);
  }

  function Human(field, x, y, houseX, houseY) {
    this.x = x;
    this.y = y;
    this.houseX = houseX;
    this.houseY = houseY;
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
    this.color = '#' + Math.floor(Math.random() * 4096).toString(16);
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
          }
        }
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
          console.log(...walkingPath);
        } break;
      }
      return walkingPath;
    }

    this.startMoving(this.houseX, this.houseY);
  }

  function Field() {
    const border = 2;
    this.x = 10;
    this.y = 10;
    this.width = 630;
    this.height = 378;
    this.cellsWidth = 25;
    this.cellsHeight = 15;
    this.cellWidth = this.width / this.cellsWidth;
    this.cellHeight = this.height / this.cellsHeight;
    this.cells = generateCells(this.cellsWidth, this.cellsHeight);
    this.humans = generateHumans(this);
    const houseColorChangePeriod = 1000;
    this.draw = function() {
      const field = this;
      ctx.beginPath();
      for (let i = 0; i < this.cellsHeight; i++) {
        for (let j = 0; j < this.cellsWidth; j++) {
          switch (this.cells[i][j].type) {
            case 0: {
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
            } break;
            case 1: {
              const { houses } = this.cells[i][j];
              if (houses.length === 0) {
                ctx.strokeRect(localX(j) + border,
                  localY(i) + border,
                  this.cellWidth - 2 * border,
                  this.cellHeight - 2 * border);
              } else {
                const houseIndex = Math.floor(Date.now() / houseColorChangePeriod)
                                 % houses.length;
                ctx.fillStyle = houses[houseIndex].color;
                ctx.fillRect(localX(j) + border,
                  localY(i) + border,
                  this.cellWidth - 2 * border,
                  this.cellHeight - 2 * border);
              }
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

    function generateHumans(field) {
      const humans = new Array(10);
      for (let i = 0; i < humans.length; i++) {
        let x = Math.floor(Math.random() * field.cellsWidth);
        let y = Math.floor(Math.random() * field.cellsHeight);
        while (field.cells[y][x].type !== 0) {
          x = Math.floor(Math.random() * field.cellsWidth);
          y = Math.floor(Math.random() * field.cellsHeight);
        }
        let houseX = Math.floor(Math.random() * field.cellsWidth);
        let houseY = Math.floor(Math.random() * field.cellsHeight);
        while (field.cells[houseY][houseX].type !== 1) {
          houseX = Math.floor(Math.random() * field.cellsWidth);
          houseY = Math.floor(Math.random() * field.cellsHeight);
        }
        humans[i] = new Human(field, x, y, houseX, houseY);
        field.cells[houseY][houseX].houses.push(humans[i]);
      }
      return humans;
    }
    
    function generateCells(width, height) {
      const cells = new Array(height);
      for (let i = 0; i < height; i++) {
        cells[i] = new Array(width);
        for (let j = 0; j < width; j++) {
          cells[i][j] = {
            type: i % 2 === 0 && j % 3 > 0 ? 1 : 0,
            houses: [],
          };
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
};


