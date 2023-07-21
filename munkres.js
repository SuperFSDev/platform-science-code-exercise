var MAX_SIZE = parseInt(Number.MAX_SAFE_INTEGER/2) || ((1 << 26)*(1 << 26));


var DEFAULT_PAD_VALUE = 0;


function Munkres() {
    this.C = null;
  
    this.row_covered = [];
    this.col_covered = [];
    this.n = 0;
    this.Z0_r = 0;
    this.Z0_c = 0;
    this.marked = null;
    this.path = null;
  }
  

  Munkres.prototype.pad_matrix = function(matrix, pad_value) {
    pad_value = pad_value || DEFAULT_PAD_VALUE;
  
    var max_columns = 0;
    var total_rows = matrix.length;
    var i;
  
    for (i = 0; i < total_rows; ++i)
      if (matrix[i].length > max_columns)
        max_columns = matrix[i].length;
  
    total_rows = max_columns > total_rows ? max_columns : total_rows;
  
    var new_matrix = [];
  
    for (i = 0; i < total_rows; ++i) {
      var row = matrix[i] || [];
      var new_row = row.slice();
  
      // If this row is too short, pad it
      while (total_rows > new_row.length)
        new_row.push(pad_value);
  
      new_matrix.push(new_row);
    }
  
    return new_matrix;
  };
  
  Munkres.prototype.compute = function(cost_matrix, options) {
  
    options = options || {};
    options.padValue = options.padValue || DEFAULT_PAD_VALUE;
  
    this.C = this.pad_matrix(cost_matrix, options.padValue);
    this.n = this.C.length;
    this.original_length = cost_matrix.length;
    this.original_width = cost_matrix[0].length;
  
    var nfalseArray = []; /* array of n false values */
    while (nfalseArray.length < this.n)
      nfalseArray.push(false);
    this.row_covered = nfalseArray.slice();
    this.col_covered = nfalseArray.slice();
    this.Z0_r = 0;
    this.Z0_c = 0;
    this.path =   this.__make_matrix(this.n * 2, 0);
    this.marked = this.__make_matrix(this.n, 0);
  
    var step = 1;
  
    var steps = { 1 : this.__step1,
                  2 : this.__step2,
                  3 : this.__step3,
                  4 : this.__step4,
                  5 : this.__step5,
                  6 : this.__step6 };
  
    while (true) {
      var func = steps[step];
      if (!func) // done
        break;
  
      step = func.apply(this);
    }
  
    var results = [];
    for (var i = 0; i < this.original_length; ++i)
      for (var j = 0; j < this.original_width; ++j)
        if (this.marked[i][j] == 1)
          results.push([i, j]);
  
    return results;
  };
  
  Munkres.prototype.__make_matrix = function(n, val) {
    var matrix = [];
    for (var i = 0; i < n; ++i) {
      matrix[i] = [];
      for (var j = 0; j < n; ++j)
        matrix[i][j] = val;
    }
  
    return matrix;
  };
  
  /**
   * For each row of the matrix, find the smallest element and
   * subtract it from every element in its row. Go to Step 2.
   */
  Munkres.prototype.__step1 = function() {
    for (var i = 0; i < this.n; ++i) {
      // Find the minimum value for this row and subtract that minimum
      // from every element in the row.
      var minval = Math.min.apply(Math, this.C[i]);
  
      for (var j = 0; j < this.n; ++j)
        this.C[i][j] -= minval;
    }
  
    return 2;
  };
  
  /**
   * Find a zero (Z) in the resulting matrix. If there is no starred
   * zero in its row or column, star Z. Repeat for each element in the
   * matrix. Go to Step 3.
   */
  Munkres.prototype.__step2 = function() {
    for (var i = 0; i < this.n; ++i) {
      for (var j = 0; j < this.n; ++j) {
        if (this.C[i][j] === 0 &&
          !this.col_covered[j] &&
          !this.row_covered[i])
        {
          this.marked[i][j] = 1;
          this.col_covered[j] = true;
          this.row_covered[i] = true;
          break;
        }
      }
    }
  
    this.__clear_covers();
  
    return 3;
  };
  
  /**
   * Cover each column containing a starred zero. If K columns are
   * covered, the starred zeros describe a complete set of unique
   * assignments. In this case, Go to DONE, otherwise, Go to Step 4.
   */
  Munkres.prototype.__step3 = function() {
    var count = 0;
  
    for (var i = 0; i < this.n; ++i) {
      for (var j = 0; j < this.n; ++j) {
        if (this.marked[i][j] == 1 && this.col_covered[j] == false) {
          this.col_covered[j] = true;
          ++count;
        }
      }
    }
  
    return (count >= this.n) ? 7 : 4;
  };
  
  /**
   * Find a noncovered zero and prime it. If there is no starred zero
   * in the row containing this primed zero, Go to Step 5. Otherwise,
   * cover this row and uncover the column containing the starred
   * zero. Continue in this manner until there are no uncovered zeros
   * left. Save the smallest uncovered value and Go to Step 6.
   */
  
  Munkres.prototype.__step4 = function() {
    var done = false;
    var row = -1, col = -1, star_col = -1;
  
    while (!done) {
      var z = this.__find_a_zero();
      row = z[0];
      col = z[1];
  
      if (row < 0)
        return 6;
  
      this.marked[row][col] = 2;
      star_col = this.__find_star_in_row(row);
      if (star_col >= 0) {
        col = star_col;
        this.row_covered[row] = true;
        this.col_covered[col] = false;
      } else {
        this.Z0_r = row;
        this.Z0_c = col;
        return 5;
      }
    }
  };
  
  /**
   * Construct a series of alternating primed and starred zeros as
   * follows. Let Z0 represent the uncovered primed zero found in Step 4.
   * Let Z1 denote the starred zero in the column of Z0 (if any).
   * Let Z2 denote the primed zero in the row of Z1 (there will always
   * be one). Continue until the series terminates at a primed zero
   * that has no starred zero in its column. Unstar each starred zero
   * of the series, star each primed zero of the series, erase all
   * primes and uncover every line in the matrix. Return to Step 3
   */
  Munkres.prototype.__step5 = function() {
    var count = 0;
  
    this.path[count][0] = this.Z0_r;
    this.path[count][1] = this.Z0_c;
    var done = false;
  
    while (!done) {
      var row = this.__find_star_in_col(this.path[count][1]);
      if (row >= 0) {
        count++;
        this.path[count][0] = row;
        this.path[count][1] = this.path[count-1][1];
      } else {
        done = true;
      }
  
      if (!done) {
        var col = this.__find_prime_in_row(this.path[count][0]);
        count++;
        this.path[count][0] = this.path[count-1][0];
        this.path[count][1] = col;
      }
    }
  
    this.__convert_path(this.path, count);
    this.__clear_covers();
    this.__erase_primes();
    return 3;
  };
  
  /**
   * Add the value found in Step 4 to every element of each covered
   * row, and subtract it from every element of each uncovered column.
   * Return to Step 4 without altering any stars, primes, or covered
   * lines.
   */
  Munkres.prototype.__step6 = function() {
    var minval = this.__find_smallest();
  
    for (var i = 0; i < this.n; ++i) {
      for (var j = 0; j < this.n; ++j) {
        if (this.row_covered[i])
          this.C[i][j] += minval;
        if (!this.col_covered[j])
          this.C[i][j] -= minval;
      }
    }
  
    return 4;
  };
  
  Munkres.prototype.__find_smallest = function() {
    var minval = MAX_SIZE;
  
    for (var i = 0; i < this.n; ++i)
      for (var j = 0; j < this.n; ++j)
        if (!this.row_covered[i] && !this.col_covered[j])
          if (minval > this.C[i][j])
            minval = this.C[i][j];
  
    return minval;
  };
  
  Munkres.prototype.__find_a_zero = function() {
    for (var i = 0; i < this.n; ++i)
      for (var j = 0; j < this.n; ++j)
        if (this.C[i][j] === 0 &&
          !this.row_covered[i] &&
          !this.col_covered[j])
          return [i, j];
  
    return [-1, -1];
  };
  
  Munkres.prototype.__find_star_in_row = function(row) {
    for (var j = 0; j < this.n; ++j)
      if (this.marked[row][j] == 1)
        return j;
  
    return -1;
  };
  
  /**
   * Find the first starred element in the specified column.
   *
   * @return {Number} The row index, or -1 if no starred element was found
   */
  Munkres.prototype.__find_star_in_col = function(col) {
    for (var i = 0; i < this.n; ++i)
      if (this.marked[i][col] == 1)
        return i;
  
    return -1;
  };
  
  
  Munkres.prototype.__find_prime_in_row = function(row) {
    for (var j = 0; j < this.n; ++j)
      if (this.marked[row][j] == 2)
        return j;
  
    return -1;
  };
  
  Munkres.prototype.__convert_path = function(path, count) {
    for (var i = 0; i <= count; ++i)
      this.marked[path[i][0]][path[i][1]] =
        (this.marked[path[i][0]][path[i][1]] == 1) ? 0 : 1;
  };
  
  /** Clear all covered matrix cells */
  Munkres.prototype.__clear_covers = function() {
    for (var i = 0; i < this.n; ++i) {
      this.row_covered[i] = false;
      this.col_covered[i] = false;
    }
  };
  
  /** Erase all prime markings */
  Munkres.prototype.__erase_primes = function() {
    for (var i = 0; i < this.n; ++i)
      for (var j = 0; j < this.n; ++j)
        if (this.marked[i][j] == 2)
          this.marked[i][j] = 0;
  };
  
  function make_cost_matrix (profit_matrix, inversion_function) {
    var i, j;
    if (!inversion_function) {
      var maximum = -1.0/0.0;
      for (i = 0; i < profit_matrix.length; ++i)
        for (j = 0; j < profit_matrix[i].length; ++j)
          if (profit_matrix[i][j] > maximum)
            maximum = profit_matrix[i][j];
  
      inversion_function = function(x) { return maximum - x; };
    }
  
    var cost_matrix = [];
  
    for (i = 0; i < profit_matrix.length; ++i) {
      var row = profit_matrix[i];
      cost_matrix[i] = [];
  
      for (j = 0; j < row.length; ++j)
        cost_matrix[i][j] = inversion_function(profit_matrix[i][j]);
    }
  
    return cost_matrix;
  }

  function format_matrix(matrix) {
    var columnWidths = [];
    var i, j;
    for (i = 0; i < matrix.length; ++i) {
      for (j = 0; j < matrix[i].length; ++j) {
        var entryWidth = String(matrix[i][j]).length;
  
        if (!columnWidths[j] || entryWidth >= columnWidths[j])
          columnWidths[j] = entryWidth;
      }
    }
  
    var formatted = '';
    for (i = 0; i < matrix.length; ++i) {
      for (j = 0; j < matrix[i].length; ++j) {
        var s = String(matrix[i][j]);
  
        // pad at front with spaces
        while (s.length < columnWidths[j])
          s = ' ' + s;
  
        formatted += s;
  
        // separate columns
        if (j != matrix[i].length - 1)
          formatted += ' ';
      }
  
      if (i != matrix[i].length - 1)
        formatted += '\n';
    }
  
    return formatted;
  }
  
  function computeMunkres(cost_matrix, options) {
    var m = new Munkres();
    return m.compute(cost_matrix, options);
  }
  
  computeMunkres.version = "1.2.2";
  computeMunkres.format_matrix = format_matrix;
  computeMunkres.make_cost_matrix = make_cost_matrix;
  computeMunkres.Munkres = Munkres; // backwards compatibility
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = computeMunkres;
  }