import fs from 'fs-extra';
import path from 'path';
import XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { Transaction, ExtractedData } from './types';

// Regular expressions for data extraction
const DATE_REGEX = /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s*\d{2,4})?/i;
const AMOUNT_REGEX = /(\d{1,3}(?:[,.]\d{3})*[,.]\d{2}|\d+[,.]\d{2})/g;
const BALANCE_REGEX = /(?:balance|b\/fwd|c\/fwd|brought\s+forward|carried\s+forward|statement|closing|opening|start)[:\s]*[£]?\s*(\d{1,3}(?:[,.]\d{3})*[,.]\d{2}|\d+[,.]\d{2})/i;

// Transaction type patterns for exact matching
const TRANSACTION_TYPES = [
  'Card Payment',
  'Card Purchase',
  'Direct Debit',
  'Direct Credit',
  'Internet Banking',
  'On-Line Banking',
  'Commission',
  'Balance',
  'ASD Deposit',
  'Refund'
];

const TRANSACTION_START = new RegExp(`(?:${TRANSACTION_TYPES.join('|')})`, 'i');

// Skip patterns for non-transaction lines
const SKIP_PATTERNS = [
  /page\s+\d+\s+of\s+\d+/i,
  /balance brought forward from previous page/i,
  /continued/i,
  /barclays bank/i,
  /authorised by/i,
  /regulated by/i,
  /financial conduct/i,
  /prudential regulation/i,
  /register no/i,
  /sort code/i,
  /b\.c\. team ltd/i,
  /^\s*$/,  // Empty lines
  /^[-=]+$/,   // Separator lines
];

// Month mapping for date formatting
const MONTH_MAP: { [key: string]: string } = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

// Transaction patterns with improved accuracy
const MONEY_IN_PATTERNS = [
  /(?:refund|credit|deposit|reversal|cashback|repayment)\s+(?:from|by|rcvd|received)/i,
  /(?:transfer|payment|bgc|receipt|faster payment)\s+(?:from|by|rcvd|received)/i,
  /(?:salary|wages|pension)\s+payment/i,
  /(?:tax|vat|hmrc)\s+refund/i,
  /(?:credit|payment)\s+received/i,
  /^refund/i,
  /^credit/i,
  /^deposit/i,
  /^salary/i,
  /^pension/i,
  /^reversal/i,
  /^receipt/i,
  /^bgc/i,
  /^fpi/i,
  /^credit\s+/i,
  /\bcredit\b/i,
  /\brefund\b/i,
  /\bdeposit\b/i
];

const MONEY_OUT_PATTERNS = [
  /^(?:card\s+(?:payment|purchase)|direct\s+debit|standing\s+order|withdrawal|purchase|bill\s+payment|atm)/i,
  /(?:transfer|payment)\s+(?:to|for|at)/i,
  /(?:debit|bill|fee|charge)/i,
  /(?:card|purchase|payment)\s+(?:to|at|for)/i,
  /(?:direct\s+debit|dd)\s+(?:to|for)/i,
  /^payment\s+to/i,
  /^direct\s+debit/i,
  /^standing\s+order/i,
  /^card\s+payment/i,
  /^purchase/i,
  /^withdrawal/i,
  /^commission/i,
  /^charges/i,
  /^fee/i,
  /^fpo/i,
  /^chaps/i,
  /^debit\s+/i,
  /\bdebit\b/i,
  /\bwithdrawal\b/i,
  /\bpurchase\b/i
];

// Words to remove from descriptions
const NOISE_WORDS = [
  'on',
  'at',
  'to',
  'from',
  'via',
  'by',
  'ref',
  'reference',
  'banking',
  'bill payment',
  'transfer',
  'payment',
  'card',
  'purchase',
  'direct debit',
  'standing order',
  'faster payment',
  'online',
  'internet',
  'mobile',
  'contactless',
  'account',
  'transaction',
  'commission',
  'charges',
  'fee',
  'uary',
  'period',
  'statement',
  'balance',
  'forward',
  'brought',
  'carried',
  'issued',
  'glance',
  'ne',
  'conne',
  'watfo',
  'limi',
  'channe',
  'stdaut',
  'amznmktplace',
  'paybyphone',
  'previous',
  'page',
  'continued',
  'ltd',
  'limited'
];

// Transaction type mapping for cleaner descriptions
const TRANSACTION_TYPE_MAP: { [key: string]: string } = {
  'DD': 'Direct Debit',
  'SO': 'Standing Order',
  'BP': 'Bill Payment',
  'FP': 'Faster Payment',
  'TFR': 'Transfer',
  'CR': 'Credit',
  'DR': 'Debit',
  'INT': 'Interest',
  'FEE': 'Fee',
  'CHG': 'Charge',
  'REF': 'Refund',
  'SAL': 'Salary',
  'PEN': 'Pension',
  'DIV': 'Dividend',
  'ATM': 'ATM Withdrawal',
  'CSH': 'Cash',
  'CHQ': 'Cheque',
  'BGC': 'Bank Giro Credit',
  'FPI': 'Faster Payment In',
  'FPO': 'Faster Payment Out',
  'CHP': 'CHAPS Payment'
};

const formatDate = (dateStr: string): string => {
  try {
    const dateMatch = dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s*(\d{4}))?/i);
    if (!dateMatch) return '';

    const day = dateMatch[1].padStart(2, '0');
    const month = MONTH_MAP[dateMatch[2].toLowerCase()];
    const year = dateMatch[3] || new Date().getFullYear().toString();
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', { dateStr, error });
    return '';
  }
};

const cleanDescription = (description: string): string => {
  if (!description) return 'Unknown Transaction';
  
  // Extract transaction type first
  let transactionType = '';
  const typeMatch = description.match(/(?:Direct Debit|Card Payment|Card Purchase|On-line Bill|Refund|Transfer|Payment)\s*(?:to|from)?\s+/i);
  if (typeMatch) {
    transactionType = typeMatch[0].trim();
    description = description.substring(typeMatch[0].length).trim();
  }

  // Remove any dates, amounts, and reference numbers first
  let cleanedDesc = description
    .replace(DATE_REGEX, '')
    .replace(AMOUNT_REGEX, '')
    .replace(/\bRef:?\s*\S+/gi, '')
    .replace(/\b[A-Z0-9]{6,}\b/g, '')
    .replace(/\s+On\s+\d{1,2}\s+[A-Za-z]{3,}/gi, '')
    .replace(/\s+(?:Limited|Ltd|Plc|Inc|Direct)\b/gi, '')
    .replace(/\s*-\s*NE\b/gi, '')
    .replace(/\s*\*+\s*/g, ' ')
    .trim();

  // Split by common separators and take the first meaningful part
  const parts = cleanedDesc.split(/\s*(?:,|\bon\b|\bat\b|\bfor\b|\bfrom\b|\bvia\b|\bby\b|\bref\b)\s*/i);
  
  // Take the first non-empty part that's not just numbers or special characters
  cleanedDesc = parts.find(part => {
    const cleaned = part.trim();
    return cleaned.length > 2 && /[a-zA-Z]/.test(cleaned) && !/^\d+$/.test(cleaned);
  }) || parts[0] || '';

  cleanedDesc = cleanedDesc.trim();

  // Capitalize properly
  cleanedDesc = cleanedDesc
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Add back the transaction type
  if (transactionType) {
    const cleanType = transactionType
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+To\s*$/, '')
      .trim();
    cleanedDesc = cleanedDesc ? `${cleanType} to ${cleanedDesc}` : cleanType;
  }

  // Final validation
  if (cleanedDesc.length < 3 || !/[a-zA-Z]{2,}/.test(cleanedDesc)) {
    return 'Unknown Transaction';
  }

  return cleanedDesc;
};

const parseAmount = (amountStr: string | null): number => {
  if (!amountStr) return 0;
  
  // Remove currency symbol and spaces
  const cleanAmount = amountStr.trim().replace(/[£\s]/g, '');
  
  // Handle negative amounts (either with minus sign or in parentheses)
  const isNegative = cleanAmount.startsWith('-') || /^\(.*\)$/.test(cleanAmount);
  
  // Convert to standard decimal format
  const numericStr = cleanAmount
    .replace(/[()+-]/g, '')
    .replace(/(\d+)[,.](\d{3})[,.](\d{2})/, '$1$2.$3') // Handle x,xxx,xx format
    .replace(/(\d+)[,.](\d{2})/, '$1.$2'); // Handle x,xx format
  
  const amount = parseFloat(numericStr);
  return isNegative ? -amount : amount;
};

const formatCurrency = (amount: number): string => {
  // Format using standard UK format (dot as decimal separator)
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(Math.abs(amount));
};

const createExcelFile = async (data: ExtractedData, outputPath: string): Promise<void> => {
  const workbook = XLSX.utils.book_new();
  const headers = ['Date', 'Description', 'Money Out (£)', 'Money In (£)', 'Balance (£)'];
  
  const rows = [
    headers,
    ...data.transactions.map(t => [
      t.date,
      t.description,
      t.moneyOut || '',
      t.moneyIn || '',
      t.balance
    ])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { width: 12 },  // Date
    { width: 50 },  // Description
    { width: 12 },  // Money Out
    { width: 12 },  // Money In
    { width: 12 },  // Balance
  ];

  // Add styling
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:E1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      fill: { fgColor: { rgb: "F2F2F2" } },
      font: { bold: true, name: 'Arial', sz: 10 },
      alignment: { horizontal: 'center' }
    };
  }

  // Add the worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  // Write to file
  await XLSX.writeFile(workbook, outputPath);
  console.log('Excel file created:', outputPath);
};

const cleanPDFText = (text: string): string[] => {
  console.log('Original text length:', text.length);
  console.log('Sample of original text:', text.substring(0, 500));

  // First clean the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');

  console.log('Cleaned text sample:', cleanedText.substring(0, 500));

  // Split into pages but keep date-amount pairs together
  const pages = cleanedText.split(/(?:Page \d+ of \d+|Continued Page|Balance brought forward)/i);
  const allLines: string[] = [];
  let pageNumber = 1;

  for (const page of pages) {
    console.log(`\nProcessing page ${pageNumber}:`, page.substring(0, 200));
    
    // Skip empty pages or headers/footers
    if (page.length < 50) {
      console.log('Skipping short page');
      continue;
    }

    // Split into lines and process
    const lines = page.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log(`Found ${lines.length} lines on page ${pageNumber}`);

    let currentTransaction = '';
    let lastValidDate = '';

    for (const line of lines) {
      // Debug each line
      console.log('\nAnalyzing line:', line);
      
      const hasDate = DATE_REGEX.test(line);
      const hasAmount = AMOUNT_REGEX.test(line);
      const hasTransactionType = TRANSACTION_TYPES.some(type => 
        line.toLowerCase().includes(type.toLowerCase())
      );

      console.log('Line analysis:', {
        hasDate,
        hasAmount,
        hasTransactionType,
        length: line.length
      });

      // Skip obvious non-transaction lines
      if (SKIP_PATTERNS.some(pattern => pattern.test(line))) {
        console.log('Skipping line - matches skip pattern');
        continue;
      }

      // If line has a date, start new transaction
      if (hasDate) {
        const dateMatch = line.match(DATE_REGEX);
        if (dateMatch) {
          lastValidDate = dateMatch[0];
          if (currentTransaction) {
            console.log('Adding complete transaction:', currentTransaction);
            allLines.push(currentTransaction);
          }
          currentTransaction = line;
          continue;
        }
      }

      // If line has amount or transaction type, it's likely part of a transaction
      if (hasAmount || hasTransactionType) {
        if (!currentTransaction && lastValidDate) {
          // Start new transaction with last known date
          currentTransaction = lastValidDate + ' ' + line;
        } else if (currentTransaction) {
          // Append to current transaction
          currentTransaction += ' ' + line;
        } else {
          // Start new transaction without date
          currentTransaction = line;
        }
      }
      // If we have a current transaction and line looks meaningful, append it
      else if (currentTransaction && line.length > 3 && /[a-zA-Z]/.test(line)) {
        currentTransaction += ' ' + line;
      }
    }

    // Add final transaction of the page
    if (currentTransaction) {
      console.log('Adding final transaction of page:', currentTransaction);
      allLines.push(currentTransaction);
    }

    pageNumber++;
  }

  console.log('\nFinal grouped lines:', allLines);
  return allLines;
};

const processTransactions = (lines: string[]): Transaction[] => {
  console.log('\nProcessing transactions from lines:', lines);
  const transactions: Transaction[] = [];
  let runningBalance = 0;

  for (const line of lines) {
    console.log('\nProcessing line for transaction:', line);

    // Extract date
    const dateMatch = line.match(DATE_REGEX);
    if (!dateMatch) {
      console.log('No date found in line');
      continue;
    }

    const date = formatDate(dateMatch[0]);
    if (!date) {
      console.log('Could not format date:', dateMatch[0]);
      continue;
    }

    // Extract amounts
    const amounts = Array.from(line.matchAll(AMOUNT_REGEX))
      .map(match => match[0])
      .map(amount => parseAmount(amount));

    console.log('Found amounts:', amounts);

    if (amounts.length < 1) {
      console.log('No amounts found in line');
      continue;
    }

    // Get description
    let description = line
      .replace(dateMatch[0], '')
      .replace(new RegExp(AMOUNT_REGEX.source, 'g'), '')
      .trim();

    description = cleanDescription(description);
    console.log('Cleaned description:', description);

    // Last amount is usually the balance
    const balance = amounts[amounts.length - 1];
    
    // If we have more than one amount, determine if it's money in or out
    if (amounts.length > 1) {
      const transactionAmount = amounts[amounts.length - 2];
      
      // Check transaction type to determine money in/out
      const isMoneyIn = MONEY_IN_PATTERNS.some(pattern => pattern.test(line)) ||
                       balance > runningBalance;

      const transaction: Transaction = {
        date,
        description,
        moneyIn: isMoneyIn ? formatCurrency(Math.abs(transactionAmount)) : null,
        moneyOut: !isMoneyIn ? formatCurrency(Math.abs(transactionAmount)) : null,
        balance: formatCurrency(balance)
      };

      console.log('Created transaction:', transaction);
      transactions.push(transaction);
      runningBalance = balance;
    } else {
      // Handle single amount case - treat as balance update
      console.log('Single amount found - treating as balance:', balance);
      runningBalance = balance;
    }
  }

  // Sort transactions by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  console.log('\nFinal transactions:', transactions);

  return transactions;
};

interface PDFPageData {
  getTextContent: () => Promise<{
    items: Array<{
      str: string;
      dir: string;
      width: number;
      height: number;
      transform: number[];
    }>;
  }>;
}

// Custom page renderer for better text extraction
const renderPage = async (pageData: PDFPageData): Promise<string> => {
  try {
    const textContent = await pageData.getTextContent();
    return textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ');
  } catch (error) {
    console.error('Error rendering page:', error);
    return '';
  }
};

export const processFile = async (inputPath: string, outputFormat: 'xlsx' | 'csv'): Promise<{ fileName: string; data: ExtractedData }> => {
  try {
    console.log('Starting file processing:', {
      inputPath,
      outputFormat,
      fileExists: await fs.pathExists(inputPath)
    });

    const dataBuffer = await fs.readFile(inputPath);
    console.log('File read successfully, size:', dataBuffer.length);

    // First attempt: Try standard PDF parsing
    const pdfData = await pdfParse(dataBuffer);

    console.log('PDF parsed successfully:', {
      pages: pdfData.numpages,
      textLength: pdfData.text.length,
      info: pdfData.info || {}
    });

    // Debug: Print first chunk of extracted text
    console.log('First 1000 chars of raw PDF text:', pdfData.text.substring(0, 1000));

    // Check if we got meaningful text
    const hasText = pdfData.text.length > 0 && /[a-zA-Z0-9]/.test(pdfData.text);
    if (!hasText) {
      console.log('No meaningful text extracted from PDF. PDF might be encrypted or contain only images.');
      throw new Error('PDF appears to be encrypted or contains no extractable text. Please ensure the PDF is not password protected.');
    }

    // Pre-process text to handle common PDF formatting issues
    const cleanedText = pdfData.text
      .replace(/\r\n/g, '\n')
      .replace(/\f/g, '\n')
      // Remove header/footer information
      .replace(/Page \d+ of \d+/g, '')
      .replace(/Your Business accounts/gi, '')
      .replace(/Statement from.*?to/gi, '')
      .replace(/Barclays Bank.*?PLC/gi, '')
      .replace(/Authorised.*?Authority/gi, '')
      .replace(/Registered.*?Office/gi, '')
      .replace(/Sort Code.*?No/gi, '')
      .replace(/Churchill Place.*?Lond/gi, '')
      .replace(/B\.c\. Team.*?No/gi, '')
      .replace(/Financial.*?Services/gi, '')
      .replace(/Important Information/gi, '')
      .replace(/For more information/gi, '')
      .replace(/If you notice/gi, '')
      .replace(/Any questions/gi, '')
      .replace(/Get in touch/gi, '')
      .replace(/Terms and conditions/gi, '')
      // Handle wrapped lines that don't start with a date
      .replace(/([^\n])\n(?!\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/g, '$1 ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ');

    // Debug: Print cleaned text
    console.log('Cleaned text preview:', cleanedText.substring(0, 1000));

    // Split into lines and process each line
    const lines = cleanedText.split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Debug line content
        if (line.length > 0) {
          console.log('Processing line:', {
            content: line,
            hasDate: DATE_REGEX.test(line),
            hasAmount: AMOUNT_REGEX.test(line),
            hasTransactionType: TRANSACTION_START.test(line)
          });
        }

        // Keep lines that have a date
        if (DATE_REGEX.test(line)) {
          return true;
        }
        // Keep lines that have an amount
        if (AMOUNT_REGEX.test(line)) {
          return true;
        }
        // Keep lines that might be transaction continuations
        if (line.length > 10 && !SKIP_PATTERNS.some(pattern => pattern.test(line))) {
          return true;
        }
        // Keep lines that look like transactions
        if (TRANSACTION_START.test(line)) {
          return true;
        }
        // Filter out common non-transaction lines
        return line && !SKIP_PATTERNS.some(pattern => pattern.test(line));
      })
      // Remove any remaining empty lines
      .filter(line => line.trim().length > 0);

    // Debug: Print filtered lines
    console.log('Filtered lines:', lines);

    // Group continued lines
    const groupedLines = cleanPDFText(cleanedText);
    console.log('Grouped lines:', groupedLines);

    // Process transactions
    const transactions = processTransactions(groupedLines);
    console.log('Processed transactions:', transactions);

    if (transactions.length === 0) {
      console.log('No transactions found. Debug info:', {
        originalTextLength: pdfData.text.length,
        cleanedTextLength: cleanedText.length,
        numberOfLines: lines.length,
        numberOfGroupedLines: groupedLines.length,
        sampleLines: lines.slice(0, 5)
      });
      throw new Error('No transactions found in the PDF. Please check if this is a valid bank statement.');
    }

    // Calculate totals
    const totals = transactions.reduce((acc, t) => ({
      credits: acc.credits + (t.moneyIn ? parseAmount(t.moneyIn) : 0),
      debits: acc.debits + (t.moneyOut ? parseAmount(t.moneyOut) : 0)
    }), { credits: 0, debits: 0 });

    // Generate output filename
    const timestamp = new Date().toISOString().split('T')[0];
    const outputFileName = `bank_statement_${timestamp}.${outputFormat}`;
    const outputPath = path.join(path.dirname(inputPath), '..', 'downloads', outputFileName);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    const extractedData: ExtractedData = {
      transactions,
      metadata: {
        totalCredits: formatCurrency(totals.credits),
        totalDebits: formatCurrency(totals.debits)
      }
    };

    if (outputFormat === 'xlsx') {
      await createExcelFile(extractedData, outputPath);
    } else {
      // Create CSV with proper escaping
      const headers = ['Date', 'Description', 'Money Out (£)', 'Money In (£)', 'Balance (£)'];
      const csvContent = [
        headers.join(','),
        ...extractedData.transactions.map(t => [
          t.date,
          `"${t.description.replace(/"/g, '""')}"`,
          t.moneyOut || '',
          t.moneyIn || '',
          t.balance
        ].join(','))
      ].join('\n');

      await fs.writeFile(outputPath, csvContent, 'utf8');
    }

    return {
      fileName: outputFileName,
      data: extractedData
    };
  } catch (error) {
    console.error('Fatal error in processFile:', error);
    throw new Error(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up input file
    try {
      await fs.remove(inputPath);
    } catch (cleanupError) {
      console.error('Error cleaning up input file:', cleanupError);
    }
  }
}; 