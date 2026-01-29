import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ProposalPreviewData } from "@/components/propuestas/types";
import { numberToWords } from "@/lib/number-to-words";

/**
 * Formats a number as Mexican currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

/**
 * Generates full HTML document from ProposalPreviewData
 * This mirrors the content shown in ProposalPreview component
 */
export function generateFullDocumentHTML(data: ProposalPreviewData): string {
  const parts: string[] = [];

  // ===== HEADER / FIRM LOGO =====
  if (data.firmSettings?.logo_url) {
    parts.push(`<div style="text-align: center; margin-bottom: 24px;"><img src="${data.firmSettings.logo_url}" alt="Logo" style="height: 56px;" /></div>`);
  }

  // ===== DATE =====
  parts.push(`<p style="text-align: right; color: #666; margin-bottom: 32px;">Ciudad de México, a ${data.documentDate}</p>`);

  // ===== RECIPIENT =====
  if (data.primaryContact) {
    parts.push(`<div style="margin-bottom: 24px;">`);
    parts.push(`<p><strong>${data.primaryContact.salutationPrefix || ''} ${data.primaryContact.fullName}</strong></p>`);
    if (data.primaryContact.position) {
      parts.push(`<p>${data.primaryContact.position}</p>`);
    }
    parts.push(`</div>`);
  }

  // ===== ENTITIES =====
  if (data.entities && data.entities.length > 0) {
    parts.push(`<div style="margin-bottom: 24px;">`);
    data.entities.forEach(entity => {
      parts.push(`<p><strong>${entity.legalName}</strong></p>`);
    });
    parts.push(`</div>`);
  }

  // ===== SALUTATION =====
  const lastName = data.primaryContact?.fullName?.split(" ").pop() || "";
  parts.push(`<p style="margin-bottom: 16px;">Estimado ${data.primaryContact?.salutationPrefix || 'Sr.'} ${lastName}:</p>`);

  // ===== INTRO PARAGRAPH =====
  parts.push(`<p style="margin-bottom: 24px;">Agradecemos la confianza depositada en nuestro despacho y, en atención a la solicitud de servicios profesionales, nos permitimos presentar a su consideración la presente propuesta de servicios profesionales.</p>`);

  // ===== I. ANTECEDENTES Y ALCANCE =====
  parts.push(`<h2 style="font-size: 16px; font-weight: bold; margin: 32px 0 16px 0; border-bottom: 1px solid #ccc; padding-bottom: 8px;">I. ANTECEDENTES Y ALCANCE DE LOS SERVICIOS</h2>`);

  // Background text
  if (data.background) {
    parts.push(`<div data-section="background" style="margin-bottom: 16px;">${data.background}</div>`);
  }

  // Services narrative (consolidated text) or individual services
  if (data.servicesNarrative) {
    parts.push(`<div data-section="services-narrative" style="margin-bottom: 16px; white-space: pre-wrap;">${data.servicesNarrative}</div>`);
  } else if (data.selectedServices && data.selectedServices.length > 0) {
    parts.push(`<p style="margin-bottom: 16px;">Para atender las necesidades descritas, proponemos los siguientes servicios:</p>`);
    data.selectedServices.forEach((s, index) => {
      const letter = String.fromCharCode(97 + index);
      const text = s.customText || s.service.description || "";
      parts.push(`<p style="margin-bottom: 12px;"><strong>${letter}) ${s.service.name}:</strong> ${text}</p>`);
    });
  }

  // ===== II. PROPUESTA DE HONORARIOS =====
  parts.push(`<h2 style="font-size: 16px; font-weight: bold; margin: 32px 0 16px 0; border-bottom: 1px solid #ccc; padding-bottom: 8px;">II. PROPUESTA DE HONORARIOS</h2>`);

  // Honorarios narrative or structured pricing
  if (data.honorariosNarrative) {
    parts.push(`<div data-section="honorarios-narrative" style="margin-bottom: 16px; white-space: pre-wrap;">${data.honorariosNarrative}</div>`);
  } else {
    // Generate based on pricing mode
    if (data.pricingMode === 'per_service' && data.selectedServices.length > 0) {
      parts.push(`<p style="margin-bottom: 16px;">Los honorarios propuestos para cada servicio son los siguientes:</p>`);
      parts.push(`<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">`);
      parts.push(`<thead><tr style="background: #f5f5f5;"><th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Servicio</th><th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Pago Inicial</th><th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Iguala Mensual</th></tr></thead>`);
      parts.push(`<tbody>`);
      data.selectedServices.forEach(s => {
        const initialFee = s.customFee ?? s.service.suggested_fee ?? 0;
        const monthlyFee = s.customMonthlyFee ?? s.service.suggested_monthly_fee ?? 0;
        parts.push(`<tr><td style="padding: 8px; border: 1px solid #ddd;">${s.service.name}</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${formatCurrency(initialFee)}</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${monthlyFee > 0 ? formatCurrency(monthlyFee) : '-'}</td></tr>`);
      });
      parts.push(`</tbody></table>`);
    } else if (data.pricingMode === 'summed' && data.selectedServices.length > 0) {
      parts.push(`<p style="margin-bottom: 16px;">Se proponen los siguientes servicios profesionales:</p>`);
      parts.push(`<ul style="margin-bottom: 16px;">`);
      data.selectedServices.forEach(s => {
        parts.push(`<li>${s.service.name}</li>`);
      });
      parts.push(`</ul>`);
      const totalInitial = data.selectedServices.reduce((sum, s) => sum + (s.customFee ?? s.service.suggested_fee ?? 0), 0);
      const totalMonthly = data.selectedServices.reduce((sum, s) => sum + (s.customMonthlyFee ?? s.service.suggested_monthly_fee ?? 0), 0);
      parts.push(`<p style="margin-bottom: 8px;"><strong>Total Pago Inicial:</strong> ${formatCurrency(totalInitial)}</p>`);
      if (totalMonthly > 0) {
        parts.push(`<p style="margin-bottom: 8px;"><strong>Total Iguala Mensual:</strong> ${formatCurrency(totalMonthly)}</p>`);
      }
    } else if (data.pricing.initialPayment > 0 || data.pricing.monthlyRetainer > 0) {
      // Global mode fallback
      if (data.pricing.initialPayment > 0) {
        const amountInWords = numberToWords(data.pricing.initialPayment);
        parts.push(`<p style="margin-bottom: 16px;">Por concepto de ${data.pricing.initialPaymentDescription}, se propone un pago inicial de <strong>${formatCurrency(data.pricing.initialPayment)}</strong> (${amountInWords} 00/100 M.N.).</p>`);
      }
      if (data.pricing.monthlyRetainer > 0) {
        const monthlyInWords = numberToWords(data.pricing.monthlyRetainer);
        parts.push(`<p style="margin-bottom: 16px;">Como iguala mensual por ${data.pricing.retainerMonths} meses, se propone <strong>${formatCurrency(data.pricing.monthlyRetainer)}</strong> (${monthlyInWords} 00/100 M.N.) mensuales.</p>`);
      }
    }
  }

  // ===== III. GARANTÍAS DE SATISFACCIÓN =====
  parts.push(`<h2 style="font-size: 16px; font-weight: bold; margin: 32px 0 16px 0; border-bottom: 1px solid #ccc; padding-bottom: 8px;">III. GARANTÍAS DE SATISFACCIÓN</h2>`);
  parts.push(`<div data-section="guarantees" style="margin-bottom: 16px;">${data.firmSettings?.guarantees_text || 'En nuestro despacho garantizamos la calidad de nuestros servicios profesionales. Si por cualquier motivo no está satisfecho con nuestro trabajo, trabajaremos sin costo adicional hasta cumplir con sus expectativas.'}</div>`);

  // ===== CLOSING =====
  parts.push(`<h2 style="font-size: 16px; font-weight: bold; margin: 32px 0 16px 0; border-bottom: 1px solid #ccc; padding-bottom: 8px;">IV. CIERRE</h2>`);
  parts.push(`<div data-section="closing" style="margin-bottom: 24px;">${data.firmSettings?.closing_text || 'Quedamos a sus órdenes para cualquier aclaración o comentario respecto a la presente propuesta. Agradecemos su preferencia y la oportunidad de colaborar con su empresa.'}</div>`);

  // ===== SIGNATURE BLOCK =====
  parts.push(`<div style="margin-top: 48px;">`);
  parts.push(`<p style="margin-bottom: 8px;">Atentamente,</p>`);
  parts.push(`<p><strong>${data.firmSettings?.name || 'El Despacho'}</strong></p>`);
  parts.push(`</div>`);

  // ===== ACCEPTANCE =====
  parts.push(`<div style="margin-top: 48px; padding: 16px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">`);
  parts.push(`<p style="font-weight: bold; margin-bottom: 16px;">ACEPTACIÓN DE LA PROPUESTA</p>`);
  parts.push(`<p style="margin-bottom: 24px;">Manifiesto que he leído y acepto los términos de la presente propuesta de servicios profesionales.</p>`);
  parts.push(`<div style="display: flex; justify-content: space-between; margin-top: 32px;">`);
  parts.push(`<div style="width: 45%;"><div style="border-bottom: 1px solid #333; height: 40px;"></div><p style="text-align: center; font-size: 12px; margin-top: 8px;">Nombre y Firma</p></div>`);
  parts.push(`<div style="width: 45%;"><div style="border-bottom: 1px solid #333; height: 40px;"></div><p style="text-align: center; font-size: 12px; margin-top: 8px;">Fecha</p></div>`);
  parts.push(`</div>`);
  parts.push(`</div>`);

  return parts.join('\n');
}

/**
 * Parsed sections from document HTML
 */
export interface ParsedDocumentSections {
  background?: string;
  servicesNarrative?: string;
  honorariosNarrative?: string;
  guarantees?: string;
  closing?: string;
}

/**
 * Parses HTML from the editor and extracts key sections
 * Used for bidirectional sync from Editor -> Preview states
 */
export function parseDocumentHTML(html: string): ParsedDocumentSections {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const result: ParsedDocumentSections = {};

  // Extract data-section elements
  const backgroundEl = doc.querySelector('[data-section="background"]');
  if (backgroundEl) {
    result.background = backgroundEl.innerHTML.trim();
  }

  const servicesEl = doc.querySelector('[data-section="services-narrative"]');
  if (servicesEl) {
    result.servicesNarrative = servicesEl.textContent?.trim() || undefined;
  }

  const honorariosEl = doc.querySelector('[data-section="honorarios-narrative"]');
  if (honorariosEl) {
    result.honorariosNarrative = honorariosEl.textContent?.trim() || undefined;
  }

  const guaranteesEl = doc.querySelector('[data-section="guarantees"]');
  if (guaranteesEl) {
    result.guarantees = guaranteesEl.innerHTML.trim();
  }

  const closingEl = doc.querySelector('[data-section="closing"]');
  if (closingEl) {
    result.closing = closingEl.innerHTML.trim();
  }

  // Fallback: try to extract sections by H2 headers if data-section not found
  if (!result.background || !result.honorariosNarrative) {
    const h2s = doc.querySelectorAll('h2');
    h2s.forEach(h2 => {
      const text = h2.textContent?.toLowerCase() || '';
      const nextSibling = h2.nextElementSibling;
      
      if (text.includes('antecedentes') && !result.background && nextSibling) {
        // Collect content until next H2
        let content = '';
        let el = nextSibling;
        while (el && el.tagName !== 'H2') {
          content += el.outerHTML || '';
          el = el.nextElementSibling as Element;
        }
        result.background = content.trim();
      }
      
      if (text.includes('honorarios') && !result.honorariosNarrative && nextSibling) {
        let content = '';
        let el = nextSibling;
        while (el && el.tagName !== 'H2') {
          content += el.textContent || '';
          el = el.nextElementSibling as Element;
        }
        result.honorariosNarrative = content.trim();
      }
    });
  }

  return result;
}

/**
 * Inserts or replaces content in a specific section of the document HTML
 * Used for inserting AI-generated content into the document editor
 *
 * @param html - The current document HTML
 * @param sectionId - The section identifier (background, services-narrative, honorarios-narrative)
 * @param content - The new content to insert
 * @returns Updated HTML with the content inserted
 */
export function insertIntoSection(html: string, sectionId: string, content: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Try to find the section by data-section attribute
  let sectionEl = doc.querySelector(`[data-section="${sectionId}"]`);

  if (sectionEl) {
    // Section exists, replace its content
    sectionEl.innerHTML = content;
  } else {
    // Section doesn't exist, try to find by header and insert after it
    const h2s = doc.querySelectorAll('h2');
    let targetH2: Element | null = null;

    h2s.forEach(h2 => {
      const text = h2.textContent?.toLowerCase() || '';
      if (sectionId === 'background' && text.includes('antecedentes')) {
        targetH2 = h2;
      } else if (sectionId === 'services-narrative' && text.includes('antecedentes')) {
        targetH2 = h2;
      } else if (sectionId === 'honorarios-narrative' && text.includes('honorarios')) {
        targetH2 = h2;
      }
    });

    if (targetH2) {
      // Create new section element and insert after the H2
      const newSection = doc.createElement('div');
      newSection.setAttribute('data-section', sectionId);
      newSection.style.marginBottom = '16px';
      if (sectionId !== 'background') {
        newSection.style.whiteSpace = 'pre-wrap';
      }
      newSection.innerHTML = content;

      // Find the next sibling to insert before, or append after H2
      const nextSibling = targetH2.nextElementSibling;
      if (nextSibling) {
        targetH2.parentNode?.insertBefore(newSection, nextSibling);
      } else {
        targetH2.parentNode?.appendChild(newSection);
      }
    }
  }

  // Return the updated HTML
  return doc.body.innerHTML;
}
