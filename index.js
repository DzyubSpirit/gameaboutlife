window.onload = function() {
  const { body } = document;
  const canvas = document.createElement('canvas');
  canvas.width = '640';
  canvas.height = '480';
  body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const field = new Field();
  
  const animationPeriod = 33;
  let lastTime = 0;
  window.requestAnimationFrame(draw);

  function draw() {
    const nowDate = Date.now();
    if (nowDate - lastTime > animationPeriod) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      field.draw();
    } else
      window.requestAnimationFrame(draw);
  }

  function Human(x, y) {
    this.x = x;
    this.y = y;
    this.walking = false;
    this.nextX = null;
    this.nextY = null;
    this.hasTarget = false;
    this.targetX = null;
    this.targetY = null;
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
    this.draw = function() {
      const field = this;
      for (let i = 0; i < this.cellsHeight; i++) {
        for (let j = 0; j < this.cellsWidth; j++) {
          switch (this.cells[i][j]) {
            case 0: {
              ctx.beginPath();
                [[-1, 0], [0, -1], [0, 1], [1, 0]].forEach(([di, dj]) => {
                  if (this.cells[i + di][j + dj] === 0) {
                    ctx.moveTo(localX(j + 0.5), localY(i + 0.5));
                    ctx.lineTo(localX(j + 0.5 + dj), localY(i + 0.5 + di));
                  }
                });
              ctx.stroke();
            } break;
            case 1: {
              ctx.strokeRect(localX(j) - border,
                localY(i) - border,
                this.cellWidth - 2 * border,
                this.cellHeight - 2 * border);
            } break;
          }
        }
      }
      ctx.fillColor = '#f00';

      function localX(x) {
        return field.x + x * field.cellWidth;
      }

      function localY(y) {
        return field.y + y * field.cellHeight;
      }

    };

    function generateHumans(field) {
      const humans = new Array(3);
      for (let i = 0; i < humans.length; i++) {
        let x = Math.floor(Math.random() * field.cellsWidth);
        let y = Math.floor(Math.random() * field.cellsHeight);
        while (field.cells[y][x] !== 0) {
          x = Math.floor(Math.random() * field.cellsWidth);
          y = Math.floor(Math.random() * field.cellsHeight);
        }
        humans[i] = new Human(x, y);
      }
      return humans;
    }
    
    function generateCells(width, height) {
      const cells = new Array(height);
      for (let i = 0; i < height; i++) {
        cells[i] = new Array(width);
        if (i === 0 || i === height - 1) {
          for (let j = 0; j < width; j++) {
            cells[i][j] = 1;
          }
        } else {
          cells[i][0] = 1;
          for (let j = 1; j < width - 1; j++) {
            cells[i][j] = i % 2 === 0 && j % 3 > 0 ? 1 : 0;
          }
          cells[i][width - 1] = 1;
        }
      }
      return cells;
    }
  }
};


