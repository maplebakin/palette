import { exportJson, buildExportFilename } from './export/index.js';
import JSZip from 'jszip';

/**
 * Export a single mood board as a JSON file
 * @param {Object} moodBoard - The mood board object to export
 * @param {string} projectName - The name of the project
 */
export function exportSingleMoodBoard(moodBoard, projectName = 'project') {
  if (!moodBoard || typeof moodBoard !== 'object') {
    console.error('Invalid mood board data provided for export');
    return;
  }

  const fileName = buildExportFilename(
    `${projectName}-${moodBoard.title || 'moodboard'}`,
    '',
    'json',
    { sanitize: true }
  );

  exportJson(moodBoard, fileName.replace('.json', ''), moodBoard, { sanitize: false });
}

/**
 * Export all mood boards from a project as individual JSON files in a ZIP archive
 * @param {Array} moodBoards - Array of mood board objects to export
 * @param {string} projectName - The name of the project
 */
export async function exportMoodBoardCollection(moodBoards, projectName = 'project') {
  if (!Array.isArray(moodBoards) || moodBoards.length === 0) {
    console.error('No mood boards provided for export');
    return;
  }

  const zip = new JSZip();
  const projectFolder = zip.folder(`${projectName}-moodboards`);

  // Add each mood board as a separate JSON file
  moodBoards.forEach((moodBoard, index) => {
    const fileName = buildExportFilename(
      `${moodBoard.title || `moodboard-${index + 1}`}`,
      '',
      'json',
      { sanitize: true }
    );
    
    projectFolder.file(fileName, JSON.stringify(moodBoard, null, 2));
  });

  // Generate the ZIP file
  const content = await zip.generateAsync({ type: 'blob' });
  
  // Create a download link and trigger the download
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildExportFilename(`${projectName}-moodboards-collection`, '', 'zip', { sanitize: true });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export mood boards with image previews (if available)
 * @param {Array} moodBoards - Array of mood board objects to export
 * @param {string} projectName - The name of the project
 * @param {boolean} includeImages - Whether to include image previews
 */
export async function exportMoodBoardsWithImages(moodBoards, projectName = 'project', includeImages = false) {
  if (!Array.isArray(moodBoards) || moodBoards.length === 0) {
    console.error('No mood boards provided for export');
    return;
  }

  const zip = new JSZip();
  const projectFolder = zip.folder(`${projectName}-moodboards`);

  for (let i = 0; i < moodBoards.length; i++) {
    const moodBoard = moodBoards[i];
    const moodBoardFolder = projectFolder.folder(`moodboard-${i + 1}-${moodBoard.title || 'unnamed'}`);

    // Add mood board data as JSON
    const jsonData = JSON.stringify(moodBoard, null, 2);
    moodBoardFolder.file('data.json', jsonData);

    // If requested, add color palette images
    if (includeImages) {
      // Create color palette image
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Mood Board: ${moodBoard.title || 'Untitled'}`, 20, 40);

      // Draw color swatches
      if (moodBoard.clusters && Array.isArray(moodBoard.clusters)) {
        let x = 20;
        let y = 80;
        
        for (const cluster of moodBoard.clusters) {
          if (cluster.slots && Array.isArray(cluster.slots)) {
            ctx.font = '16px Arial';
            ctx.fillText(cluster.title || 'Cluster', x, y - 10);
            
            for (let j = 0; j < cluster.slots.length; j++) {
              const slot = cluster.slots[j];
              if (slot.color) {
                ctx.fillStyle = slot.color;
                ctx.fillRect(x, y, 80, 80);
                
                // Draw border
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, 80, 80);
                
                // Draw color hex
                ctx.fillStyle = '#000000';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(slot.color.toUpperCase(), x + 40, y + 95);
                
                x += 90;
                
                // Move to next row if we exceed canvas width
                if (x > canvas.width - 100) {
                  x = 20;
                  y += 110;
                  
                  // Check if we need to move to next canvas
                  if (y > canvas.height - 100) {
                    // For simplicity, we'll just stop adding swatches if they don't fit
                    break;
                  }
                }
              }
            }
            
            // Move to next row for next cluster
            x = 20;
            y += 110;
            
            if (y > canvas.height - 100) {
              break; // Stop if we run out of space
            }
          }
        }
      }

      // Convert canvas to blob and add to ZIP
      canvas.toBlob((blob) => {
        moodBoardFolder.file('palette.png', blob);
      }, 'image/png');
    }
  }

  // Generate the ZIP file
  const content = await zip.generateAsync({ type: 'blob' });
  
  // Create a download link and trigger the download
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildExportFilename(`${projectName}-moodboards-with-images`, '', 'zip', { sanitize: true });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}