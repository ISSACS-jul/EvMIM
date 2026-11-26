import ExcelJS from 'exceljs';
import { Asignatura, Curso, Estudiante } from '../types';
import { DatabaseService } from './db';
import { guardarArchivoConDialogo } from './fileSaver';

const ordenarPorApellido = (lista: Estudiante[]) =>
  [...lista].sort((a, b) => {
    const cmp = (a.apellido || '').localeCompare(b.apellido || '', 'es', { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
  });

// Paleta pastel inspirada en la planilla de referencia para fácil lectura
const PALETA_CATEGORIAS = [
  { header: 'FFB4C6E7', body: 'FFD9E1F2' }, // Azul acero suave
  { header: 'FFD9D2E9', body: 'FFEFEBF7' }, // Lavanda / Lila
  { header: 'FFEAD1DC', body: 'FFF4E6EC' }, // Rosa pastel
  { header: 'FFF9CB9C', body: 'FFFCE5CD' }, // Durazno / Naranja claro
  { header: 'FFB6D7A8', body: 'FFD9EAD3' }, // Verde menta suave
  { header: 'FFA2C4C9', body: 'FFD0E0E3' }, // Turquesa suave
];

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF334155' } },
  left: { style: 'thin', color: { argb: 'FF334155' } },
  bottom: { style: 'thin', color: { argb: 'FF334155' } },
  right: { style: 'thin', color: { argb: 'FF334155' } },
};

const mediumBottomBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF334155' } },
  left: { style: 'thin', color: { argb: 'FF334155' } },
  bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
  right: { style: 'thin', color: { argb: 'FF334155' } },
};

const colLetter = (col1Based: number): string => {
  let temp = col1Based;
  let letter = '';
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
};

export async function exportarPlanillaExcel(
  curso: Curso,
  periodo: number,
  asignatura?: Asignatura | null
): Promise<void> {
  const config = DatabaseService.getConfiguracion();
  const categorias = DatabaseService.getCategorias();
  const todosEstudiantes = DatabaseService.getEstudiantes(curso.id);
  const targetId = asignatura?.id || curso.id;

  const estudiantes = ordenarPorApellido(
    asignatura
      ? todosEstudiantes.filter(
          e => !e.asignaturaIds || e.asignaturaIds.length === 0 || e.asignaturaIds.includes(asignatura.id)
        )
      : todosEstudiantes
  );

  const actividades = DatabaseService.getActividades(targetId, periodo);
  const calificaciones = DatabaseService.getCalificaciones();
  const categoriasCon = categorias.filter(cat => actividades.some(a => a.categoriaId === cat.id));
  const esUltimoPeriodo = periodo >= config.periodosCount;

  const getNota = (estId: string, actId: string): number | null => {
    const cal = calificaciones.find(c => c.estudianteId === estId && c.actividadId === actId);
    return cal ? cal.nota : null;
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EvMIM';
  const sheetName = `${asignatura?.nombre || curso.nombre} P${periodo}`
    .replace(/[:\\/?*\[\]]/g, '')
    .slice(0, 31) || `Periodo ${periodo}`;
  const ws = wb.addWorksheet(sheetName);

  // Configurar fuente base
  const baseFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
  const boldFont: Partial<ExcelJS.Font> = { ...baseFont, bold: true };

  // --- ENCABEZADOS FILA 1 Y FILA 2 ---
  // Bloque Estudiante (Cols 1, 2, 3)
  ws.mergeCells(1, 1, 1, 3);
  const estHeaderCell = ws.getCell(1, 1);
  estHeaderCell.value = 'Estudiante';
  estHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE59B' } };
  estHeaderCell.font = boldFont;
  estHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 3; c++) ws.getCell(1, c).border = thinBorder;

  const subHeadersEst = ['#', 'Apellido', 'Nombre'];
  subHeadersEst.forEach((txt, idx) => {
    const cell = ws.getCell(2, idx + 1);
    cell.value = txt;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    cell.font = boldFont;
    cell.alignment = { horizontal: idx === 0 ? 'center' : 'left', vertical: 'middle' };
    cell.border = mediumBottomBorder;
  });

  // Bloques de Categorías
  let colCursor = 4;
  interface CatColInfo {
    catId: string;
    catNombre: string;
    peso: number;
    actStartCol: number;
    actEndCol: number;
    defCol: number;
    acts: typeof actividades;
    paleta: { header: string; body: string };
  }
  const catInfos: CatColInfo[] = [];

  categoriasCon.forEach((cat, catIdx) => {
    const actsCat = actividades.filter(a => a.categoriaId === cat.id);
    const paleta = PALETA_CATEGORIAS[catIdx % PALETA_CATEGORIAS.length];
    const startCol = colCursor;
    const esUnica = actsCat.length === 1;

    if (esUnica) {
      // Categoría de 1 sola nota (ej. Autoevaluación o Evaluación Final): una única columna combinada
      ws.mergeCells(1, startCol, 2, startCol);
      const catHeaderCell = ws.getCell(1, startCol);
      catHeaderCell.value = `${cat.nombre} (${cat.pesoPorcentaje}%)`;
      catHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header } };
      catHeaderCell.font = boldFont;
      catHeaderCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      ws.getCell(1, startCol).border = thinBorder;
      ws.getCell(2, startCol).border = mediumBottomBorder;

      catInfos.push({
        catId: cat.id,
        catNombre: cat.nombre,
        peso: cat.pesoPorcentaje,
        actStartCol: startCol,
        actEndCol: startCol,
        defCol: startCol,
        acts: actsCat,
        paleta,
      });
      colCursor++;
    } else {
      actsCat.forEach((_, idx) => {
        const subCell = ws.getCell(2, colCursor);
        subCell.value = `#${idx + 1}`;
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.body } };
        subCell.font = boldFont;
        subCell.alignment = { horizontal: 'center', vertical: 'middle' };
        subCell.border = mediumBottomBorder;
        colCursor++;
      });

      const defCol = colCursor;
      const defSubCell = ws.getCell(2, defCol);
      defSubCell.value = 'DEF';
      defSubCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header } };
      defSubCell.font = boldFont;
      defSubCell.alignment = { horizontal: 'center', vertical: 'middle' };
      defSubCell.border = mediumBottomBorder;

      if (defCol > startCol) {
        ws.mergeCells(1, startCol, 1, defCol);
      }
      const catHeaderCell = ws.getCell(1, startCol);
      catHeaderCell.value = `${cat.nombre} (${cat.pesoPorcentaje}%)`;
      catHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header } };
      catHeaderCell.font = boldFont;
      catHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = startCol; c <= defCol; c++) ws.getCell(1, c).border = thinBorder;

      catInfos.push({
        catId: cat.id,
        catNombre: cat.nombre,
        peso: cat.pesoPorcentaje,
        actStartCol: startCol,
        actEndCol: defCol - 1,
        defCol,
        acts: actsCat,
        paleta,
      });
      colCursor++;
    }
  });

  // Columna Final
  const finalCol = colCursor;
  ws.mergeCells(1, finalCol, 2, finalCol);
  const finalHeader = ws.getCell(1, finalCol);
  finalHeader.value = 'Final';
  finalHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEC4899' } };
  finalHeader.font = { ...boldFont, color: { argb: 'FFFFFFFF' } };
  finalHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell(1, finalCol).border = thinBorder;
  ws.getCell(2, finalCol).border = mediumBottomBorder;
  colCursor++;

  // Columna Meta Año (solo en último periodo)
  let metaCol = -1;
  if (esUltimoPeriodo) {
    metaCol = colCursor;
    ws.mergeCells(1, metaCol, 2, metaCol);
    const metaHeader = ws.getCell(1, metaCol);
    metaHeader.value = 'Meta Año';
    metaHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBAE6FD' } };
    metaHeader.font = boldFont;
    metaHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(1, metaCol).border = thinBorder;
    ws.getCell(2, metaCol).border = mediumBottomBorder;
    colCursor++;
  }

  const totalColsPlanilla = colCursor - 1;

  // --- FILAS DE ESTUDIANTES (desde Fila 3) ---
  estudiantes.forEach((est, idx) => {
    const r = idx + 3;

    const cNum = ws.getCell(r, 1);
    cNum.value = idx + 1;
    cNum.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    cNum.font = boldFont;
    cNum.alignment = { horizontal: 'center', vertical: 'middle' };
    cNum.border = thinBorder;

    const cApe = ws.getCell(r, 2);
    cApe.value = est.apellido || '';
    cApe.font = baseFont;
    cApe.alignment = { horizontal: 'left', vertical: 'middle' };
    cApe.border = thinBorder;

    const cNom = ws.getCell(r, 3);
    cNom.value = est.nombre || '';
    cNom.font = baseFont;
    cNom.alignment = { horizontal: 'left', vertical: 'middle' };
    cNom.border = thinBorder;

    const defRefs: { colL: string; peso: number }[] = [];

    for (const cm of catInfos) {
      const esUnica = cm.acts.length === 1;
      if (esUnica) {
        const nota = getNota(est.id, cm.acts[0].id);
        const cAct = ws.getCell(r, cm.actStartCol);
        cAct.border = thinBorder;
        cAct.alignment = { horizontal: 'center', vertical: 'middle' };
        cAct.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cm.paleta.body } };
        if (nota !== null) {
          cAct.value = Number(nota.toFixed(2));
          cAct.numFmt = '0.0';
          cAct.font =
            nota < config.notaAprobatoria
              ? { ...boldFont, color: { argb: 'FFCC0000' } }
              : boldFont;
        } else {
          cAct.font = baseFont;
        }
        defRefs.push({ colL: colLetter(cm.defCol), peso: cm.peso });
        continue;
      }

      let sumaCat = 0;
      let countCat = 0;

      cm.acts.forEach((act, aIdx) => {
        const nota = getNota(est.id, act.id);
        const cAct = ws.getCell(r, cm.actStartCol + aIdx);
        cAct.border = thinBorder;
        cAct.alignment = { horizontal: 'center', vertical: 'middle' };
        if (nota !== null) {
          cAct.value = Number(nota.toFixed(2));
          cAct.numFmt = '0.0';
          cAct.font =
            nota < config.notaAprobatoria
              ? { ...boldFont, color: { argb: 'FFCC0000' } }
              : baseFont;
          if (nota < config.notaAprobatoria) {
            cAct.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          }
          sumaCat += nota;
          countCat++;
        } else {
          cAct.font = baseFont;
        }
      });

      const promCatVal = countCat > 0 ? Number((sumaCat / countCat).toFixed(2)) : undefined;
      const startL = colLetter(cm.actStartCol);
      const endL = colLetter(cm.actEndCol);
      const cDef = ws.getCell(r, cm.defCol);
      cDef.value = {
        formula: `IF(COUNT(${startL}${r}:${endL}${r})=0,"",ROUND(AVERAGE(${startL}${r}:${endL}${r}),1))`,
        result: promCatVal,
      };
      cDef.numFmt = '0.0';
      cDef.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cm.paleta.body } };
      cDef.font =
        promCatVal !== undefined && promCatVal < config.notaAprobatoria
          ? { ...boldFont, color: { argb: 'FFCC0000' } }
          : boldFont;
      cDef.alignment = { horizontal: 'center', vertical: 'middle' };
      cDef.border = thinBorder;

      defRefs.push({ colL: colLetter(cm.defCol), peso: cm.peso });
    }

    // Cálculo local de la nota final para cachear 'result' en la fórmula
    let sumaFin = 0;
    let pesoFin = 0;
    for (const cm of catInfos) {
      const notasCat = cm.acts
        .map(a => getNota(est.id, a.id))
        .filter((n): n is number => n !== null);
      if (notasCat.length > 0) {
        const pCat = notasCat.reduce((a, b) => a + b, 0) / notasCat.length;
        sumaFin += pCat * cm.peso;
        pesoFin += cm.peso;
      }
    }
    const finalVal = pesoFin > 0 ? Number((sumaFin / pesoFin).toFixed(2)) : undefined;

    const cFinal = ws.getCell(r, finalCol);
    if (defRefs.length > 0) {
      const cellList = defRefs.map(d => `${d.colL}${r}`).join(',');
      const numTerms = defRefs.map(d => `IF(ISNUMBER(${d.colL}${r}),${d.colL}${r}*${d.peso},0)`).join('+');
      const denTerms = defRefs.map(d => `IF(ISNUMBER(${d.colL}${r}),${d.peso},0)`).join('+');
      cFinal.value = {
        formula: `IF(COUNT(${cellList})=0,"",ROUND((${numTerms})/(${denTerms}),1))`,
        result: finalVal,
      };
    }
    cFinal.numFmt = '0.0';
    cFinal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4E6EC' } };
    cFinal.font =
      finalVal !== undefined && finalVal < config.notaAprobatoria
        ? { ...boldFont, color: { argb: 'FFCC0000' } }
        : boldFont;
    cFinal.alignment = { horizontal: 'center', vertical: 'middle' };
    cFinal.border = thinBorder;

    if (esUltimoPeriodo && metaCol > 0) {
      const cMeta = ws.getCell(r, metaCol);
      const meta = DatabaseService.calcularNotaNecesariaAnio(est.id, targetId, periodo);
      cMeta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
      cMeta.alignment = { horizontal: 'center', vertical: 'middle' };
      cMeta.border = thinBorder;
      if (meta) {
        if (meta.yaAproboAnio) {
          cMeta.value = 'Aprobado';
          cMeta.font = { ...boldFont, color: { argb: 'FF047857' } };
        } else {
          cMeta.value = Number(meta.notaNecesariaAnio.toFixed(2));
          cMeta.numFmt = '0.0';
          cMeta.font =
            meta.notaNecesariaAnio > config.maxNota
              ? { ...boldFont, color: { argb: 'FFCC0000' } }
              : boldFont;
        }
      }
    }
  });

  // --- CUADRO LATERAL DERECHO: CATEGORÍAS Y DESCRIPCIÓN DE NOTAS ---
  const sideCol1 = totalColsPlanilla + 3; // 2 columnas de espacio
  const sideCol2 = sideCol1 + 1;
  let sideRow = 2;

  for (const cm of catInfos) {
    const h1 = ws.getCell(sideRow, sideCol1);
    h1.value = cm.catNombre;
    h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cm.paleta.header } };
    h1.font = boldFont;
    h1.alignment = { horizontal: 'center', vertical: 'middle' };
    h1.border = thinBorder;

    const h2 = ws.getCell(sideRow, sideCol2);
    h2.value = 'Descripcion';
    h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cm.paleta.header } };
    h2.font = boldFont;
    h2.alignment = { horizontal: 'center', vertical: 'middle' };
    h2.border = thinBorder;
    sideRow++;

    cm.acts.forEach((act, idx) => {
      const cId = ws.getCell(sideRow, sideCol1);
      cId.value = `N${idx + 1}`;
      cId.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cm.paleta.body } };
      cId.font = boldFont;
      cId.alignment = { horizontal: 'center', vertical: 'middle' };
      cId.border = thinBorder;

      const cDesc = ws.getCell(sideRow, sideCol2);
      cDesc.value = act.descripcion ? `${act.titulo} — ${act.descripcion}` : act.titulo;
      cDesc.font = baseFont;
      cDesc.alignment = { horizontal: 'left', vertical: 'middle' };
      cDesc.border = thinBorder;
      sideRow++;
    });

    sideRow++;
  }

  // --- ANCHOS DE COLUMNA ---
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 24;
  for (let c = 4; c <= totalColsPlanilla; c++) {
    ws.getColumn(c).width = c === finalCol || c === metaCol ? 11 : 7;
  }
  ws.getColumn(totalColsPlanilla + 1).width = 4;
  ws.getColumn(totalColsPlanilla + 2).width = 4;
  ws.getColumn(sideCol1).width = 18;
  ws.getColumn(sideCol2).width = 44;

  // Altura cómoda para encabezados
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 20;

  // Descargar archivo .xlsx con diálogo "Guardar como"
  const buffer = await wb.xlsx.writeBuffer();
  const safeCurso = curso.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeAsig = (asignatura?.nombre || 'General').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Planilla_${safeCurso}_${safeAsig}_P${periodo}.xlsx`;
  await guardarArchivoConDialogo(
    new Uint8Array(buffer as ArrayBuffer),
    fileName,
    'xlsx',
    'Libro de Excel'
  );
}
