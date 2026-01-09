#!/usr/bin/env ts-node

/**
 * CepSMS Hesaplarını Environment Variable Formatında Export Et
 * 
 * Kullanım:
 *   npx ts-node scripts/export-cepsms-accounts.ts
 *   npx ts-node scripts/export-cepsms-accounts.ts --username bahi1
 */

import { getAllAccounts, getAccountByUsername, CepSMSAccount } from '../lib/utils/cepsmsAccounts';

function formatAsEnvVars(account: CepSMSAccount): string {
  return `CEPSMS_USERNAME=${account.username}
CEPSMS_PASSWORD=${account.password}
CEPSMS_FROM=${account.from || 'CepSMS'}`;
}

function main() {
  const args = process.argv.slice(2);
  const usernameArg = args.find(arg => arg.startsWith('--username='));
  const username = usernameArg ? usernameArg.split('=')[1] : null;

  if (username) {
    // Belirli bir kullanıcı için export
    const account = getAccountByUsername(username);
    if (!account) {
      console.error(`❌ Kullanıcı bulunamadı: ${username}`);
      process.exit(1);
    }
    console.log(`\n📋 ${account.username} hesabı için environment variables:\n`);
    console.log(formatAsEnvVars(account));
    console.log(`\n📱 Telefon: ${account.phone}\n`);
  } else {
    // Tüm hesapları export et
    const accounts = getAllAccounts();
    console.log(`\n📋 Toplam ${accounts.length} CepSMS hesabı:\n`);
    console.log('='.repeat(80));
    
    accounts.forEach((account, index) => {
      console.log(`\n${index + 1}. ${account.username} (${account.phone}):`);
      console.log('-'.repeat(80));
      console.log(formatAsEnvVars(account));
      console.log('-'.repeat(80));
    });
    
    console.log('\n');
  }
}

main();
