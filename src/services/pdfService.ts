import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tipagem simples para o que precisamos
interface RepertoireData {
  name: string;
  defaultVocalistName?: string;
}

interface SongData {
  order: number;
  title: string;
  key: string;
  notes?: string;
}

export function exportRepertoireToPDF(repertoire: RepertoireData, songs: SongData[]) {
  const doc = new jsPDF();

  // --- CABEÇALHO ---
  
  // Título do App (Pequeno no topo)
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('MySetList App', 14, 10);

  // Nome do Repertório (Grande e em destaque)
  doc.setFontSize(22);
  doc.setTextColor(0); // Preto
  doc.setFont('helvetica', 'bold');
  doc.text(repertoire.name, 14, 20);

  // Informações Extras (Vocalista e Data)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 28;
  if (repertoire.defaultVocalistName) {
    doc.text(`Vocalista Principal: ${repertoire.defaultVocalistName}`, 14, yPos);
    yPos += 6;
  }
  
  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Gerado em: ${today}`, 14, yPos);

  // --- TABELA DE MÚSICAS ---
  
  // Prepara os dados para a tabela
  const tableBody = songs.map(song => [
    song.order.toString(),
    song.title,
    song.key || '-',
    song.notes || ''
  ]);

  autoTable(doc, {
    startY: yPos + 10,
    head: [['#', 'Música', 'Tom', 'Observações']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66] }, // Cor escura (cinza chumbo)
    styles: { fontSize: 11, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' }, // Coluna #
      1: { cellWidth: 'auto', fontStyle: 'bold' }, // Coluna Título
      2: { cellWidth: 20, halign: 'center' }, // Coluna Tom
      3: { cellWidth: 80 } // Coluna Obs
    }
  });

  // Salva o arquivo
  const cleanName = repertoire.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${cleanName}_setlist.pdf`);
}