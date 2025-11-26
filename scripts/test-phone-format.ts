// Test script for formatPhoneNumber function
import { formatPhoneNumber } from '../lib/utils/cepSMSProvider';

// Test cases
interface TestCase {
  input: string;
  expected: string;
  description: string;
}

const testCases: TestCase[] = [
  // Format: 905********* (12 haneli, 905 ile başlıyor)
  { input: '905551234567', expected: '905551234567', description: '905 ile başlayan 12 haneli numara' },
  { input: '905321234567', expected: '905321234567', description: '905 ile başlayan 12 haneli numara (3xx)' },
  
  // Format: 50******** (10 haneli, 50 ile başlıyor)
  { input: '5051234567', expected: '905051234567', description: '50 ile başlayan 10 haneli numara' },
  { input: '5012345678', expected: '905012345678', description: '50 ile başlayan 10 haneli numara' },
  
  // Format: 050******** (11 haneli, 050 ile başlıyor)
  { input: '05051234567', expected: '905051234567', description: '050 ile başlayan 11 haneli numara' },
  { input: '05012345678', expected: '905012345678', description: '050 ile başlayan 11 haneli numara' },
  
  // Diğer formatlar
  { input: '05551234567', expected: '905551234567', description: '0555 ile başlayan 11 haneli numara' },
  { input: '5551234567', expected: '905551234567', description: '555 ile başlayan 10 haneli numara' },
];

console.log('Telefon Numarası Format Testi\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  try {
    const result = formatPhoneNumber(testCase.input);
    const success = result === testCase.expected;
    
    if (success) {
      console.log(`✓ Test ${index + 1}: ${testCase.description}`);
      console.log(`  Girdi: ${testCase.input} → Çıktı: ${result}`);
      passed++;
    } else {
      console.log(`✗ Test ${index + 1}: ${testCase.description}`);
      console.log(`  Girdi: ${testCase.input}`);
      console.log(`  Beklenen: ${testCase.expected}`);
      console.log(`  Alınan: ${result}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`✗ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Girdi: ${testCase.input}`);
    console.log(`  Hata: ${error.message}`);
    failed++;
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(`Toplam: ${testCases.length} test`);
console.log(`Başarılı: ${passed}`);
console.log(`Başarısız: ${failed}`);

if (failed > 0) {
  process.exit(1);
}

