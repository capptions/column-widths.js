// Rewrite of https://github.com/cmfcmf/ColumnWidthCalculator

const NARROWS = '!ifjl,;.:-|\xC2\xA0\n\r\t\0\x0B';
const WIDES = 'wm—G@';

const textWidth = (text = '') => Math.max(1, text.split('').reduce((width, c) => width +
  (NARROWS.includes(c) ? 0.4 : WIDES.includes(c) ? 1.3 : 1), 0));

const calculate = (col) => {
  col.avg = col.sum / col.count;

  const diffs = col.raw.map(value => value - col.avg);
  const squares = diffs.map(value => value * value);
  const avgSquare = squares.reduce((total, value) => total + value, 0) / col.count;

  col.sd = Math.sqrt(avgSquare);
  col.cv = col.sd / col.avg;
  col.sdmax = col.sd / col.max;

  if ((col.sdmax < 0.3 || col.cv === 1) && (col.cv === 0 || (col.cv > 0.6 && col.cv < 1.5))) {
    col.calc = col.avg;
  }
  else {
    col.calc = col.avg + (col.max / col.avg) * 2 / Math.abs(1 - col.cv);

    if (col.calc > col.max) {
      const tmp = (col.cv > 1 && col.sd > 4.5 && col.sdmax > 0.2) ? (col.max - col.avg) / 2 : 0;
      col.calc = col.max - tmp;
    }
  }
};

module.exports = (rows, minPercentage = 10) => {
  const columns = [];

  rows.forEach(row => row.forEach((column, i) => {
    const width = textWidth(column);
    columns[i] = columns[i] || { max: width, sum: 0, raw: [], count: 0 };
    columns[i].max = Math.max(columns[i].max, width);
    columns[i].sum += width;
    columns[i].count += 1;
    columns[i].raw.push(width);
  }));

  columns.forEach(calculate);

  const total = columns.reduce((total, col) => total + col.calc, 0);

  columns.forEach(col => col.percentage = 100 / (total / col.calc));
  columns.forEach(col => {
    const short = minPercentage - col.percentage;

    if (short < 0) {
      return;
    }

    let lowestDistance = 9999999;
    let stealColumn = columns.filter(col => {
      const distance = Math.abs(1 - col.cv);
      const shouldSteal =
        distance < lowestDistance &&
        col.calc - short > col.avg &&
        col.percentage - minPercentage >= short;

      if (shouldSteal) {
        lowestDistance = distance;
      }

      return shouldSteal;
    }).pop();

    if (!stealColumn) {
      stealColumn = columns.sort((a, b) => a.percentage - b.percentage).pop();
    }

    stealColumn.percentage -= short;
    col.percentage = minPercentage;
  });

  return columns.map(col => col.percentage);
};
