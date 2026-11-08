import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Printer, 
  Plus, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Receipt,
  Check,
  X,
  MessageSquare,
  Search,
  Filter,
  Share2,
  WalletCards,
  Trash2,
  Edit3
} from 'lucide-react';
import { 
  Employee, 
  AttendanceRecord, 
  SalarySlip, 
  UserRole,
  EmployeeKasbonRecord
} from '../types/index.ts';
import { 
  formatCurrency, 
  formatNumber, 
  formatDate, 
  formatDateTime,
  getTodayDateString, 
  generateInvoiceCode,
  formatPhoneNumberForWhatsApp,
  generateWhatsAppSalaryMessage
} from '../utils/formatters.ts';

interface AttendanceSalaryProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  salarySlips: SalarySlip[];
  kasbonRecords: EmployeeKasbonRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  onGenerateSalarySlip: (slip: SalarySlip) => void;
  onDeleteSalarySlip: (slipId: string) => void;
  onPrintSalarySlip: (slip: SalarySlip) => void;
  onSaveEmployee: (employee: Employee) => void;
  onSaveKasbon: (record: EmployeeKasbonRecord) => void;
  onDeleteKasbon: (id: string) => void;
  userRole: UserRole;
  storeName?: string;
}

export const AttendanceSalary: React.FC<AttendanceSalaryProps> = ({
  employees,
  attendanceRecords,
  salarySlips,
  kasbonRecords,
  onSaveAttendance,
  onGenerateSalarySlip,
  onDeleteSalarySlip,
  onPrintSalarySlip,
  onSaveEmployee,
  onSaveKasbon,
  onDeleteKasbon,
  userRole,
  storeName = 'Ans Chicken Group',
}) => {
  // Main sub-tab state: 'buat_slip' (default) | 'riwayat_gaji' | 'kasbon' | 'karyawan'
  const [activeTab, setActiveTab] = useState<'buat_slip' | 'riwayat_gaji' | 'kasbon' | 'karyawan'>('buat_slip');

  // Input Slip Gaji State
  const todayStr = getTodayDateString();
  const [slipDate, setSlipDate] = useState<string>(todayStr);
  const [slipSearchQuery, setSlipSearchQuery] = useState<string>('');
  
  // Riwayat Gaji Filter State (Default filter is HARI INI)
  const [historyDateFilter, setHistoryDateFilter] = useState<string>(todayStr);
  const [historyStartDate, setHistoryStartDate] = useState<string>(todayStr);
  const [historyEndDate, setHistoryEndDate] = useState<string>(todayStr);
  const [historyFilterMode, setHistoryFilterMode] = useState<'single' | 'range' | 'all'>('single');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyEmpFilter, setHistoryEmpFilter] = useState<string>('ALL');

  // Modal deletion & notification state
  const [slipToDelete, setSlipToDelete] = useState<SalarySlip | null>(null);
  const [payrollSuccessNotification, setPayrollSuccessNotification] = useState<string | null>(null);

  // Per-employee Slip Entry State: { wage, addition, kasbon, notes }
  const [slipEntries, setSlipEntries] = useState<Record<string, {
    wage: number;
    addition: number;
    kasbon: number;
    notes: string;
  }>>({});

  // Helper: Get Indonesian Day Name
  const getDayNameID = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()] || '';
  };

  // Helper: Format Date DD/Nop/YYYY
  const formatDateDDNopYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2];
    const monthNames: Record<string, string> = {
      '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mei', '06': 'Jun',
      '07': 'Jul', '08': 'Agu', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
    };
    return `${dd}/${monthNames[mm] || mm}/${yyyy}`;
  };

  // Helper to calculate active outstanding kasbon balance for an employee
  const getEmployeeOutstandingKasbon = (empId: string): number => {
    const list = kasbonRecords.filter(k => k.employeeId === empId);
    const borrowed = list.filter(k => k.type === 'pinjam').reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
    const repaid = list.filter(k => k.type === 'bayar_slip' || k.type === 'bayar_manual').reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
    return Math.max(0, borrowed - repaid);
  };

  // Active employees for selected date
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (emp.status === 'Aktif' || !emp.status) return true;
      if (emp.status === 'Non-Aktif' && emp.deactivatedAt) {
        return slipDate <= emp.deactivatedAt;
      }
      return true;
    });
  }, [employees, slipDate]);

  // Filtered active employees for slip entry search
  const filteredActiveEmployees = useMemo(() => {
    if (!slipSearchQuery.trim()) return activeEmployees;
    const q = slipSearchQuery.toLowerCase();
    return activeEmployees.filter(emp => 
      emp.name.toLowerCase().includes(q) || emp.role.toLowerCase().includes(q) || emp.code.toLowerCase().includes(q)
    );
  }, [activeEmployees, slipSearchQuery]);

  // Initialize/Sync slip entries whenever slipDate, activeEmployees, or kasbonRecords change
  useEffect(() => {
    const mapped: Record<string, { wage: number; addition: number; kasbon: number; notes: string }> = {};

    employees.forEach(emp => {
      const defaultWage = 0;
      const defaultAddition = 0;
      const defaultKasbon = 0;

      // Check if a salary slip already exists for this employee on slipDate
      const existingSlip = salarySlips.find(s => 
        s.employeeId === emp.id && 
        (s.periodStart === slipDate || s.periodEnd === slipDate || s.generatedDate.startsWith(slipDate))
      );

      if (existingSlip) {
        mapped[emp.id] = {
          wage: existingSlip.totalDailyWage,
          addition: existingSlip.bonus || existingSlip.totalOvertimePay || 0,
          kasbon: existingSlip.deduction || 0,
          notes: existingSlip.notes || '',
        };
      } else {
        mapped[emp.id] = {
          wage: defaultWage,
          addition: defaultAddition,
          kasbon: defaultKasbon,
          notes: '',
        };
      }
    });

    setSlipEntries(mapped);
  }, [slipDate, employees, kasbonRecords, salarySlips]);

  // Batch summary totals for slip entries on selected date
  const batchSummary = useMemo(() => {
    let totalWage = 0;
    let totalAddition = 0;
    let totalKasbon = 0;
    let totalNet = 0;

    activeEmployees.forEach(emp => {
      const entry = slipEntries[emp.id] || { wage: emp.dailyWage || 100000, addition: 0, kasbon: 0, notes: '' };
      const w = Number(entry.wage) || 0;
      const a = Number(entry.addition) || 0;
      const k = Number(entry.kasbon) || 0;
      const n = Math.max(0, w + a - k);

      totalWage += w;
      totalAddition += a;
      totalKasbon += k;
      totalNet += n;
    });

    return { totalWage, totalAddition, totalKasbon, totalNet };
  }, [activeEmployees, slipEntries]);

  // Save single employee slip
  const handleSaveSingleSlip = (emp: Employee) => {
    const entry = slipEntries[emp.id] || {
      wage: emp.dailyWage || 100000,
      addition: 0,
      kasbon: 0,
      notes: ''
    };

    const activeKasbon = getEmployeeOutstandingKasbon(emp.id);
    const totalWage = Number(entry.wage) || 0;
    const additionVal = Number(entry.addition) || 0;
    const kasbonLoanVal = Number(entry.kasbon) || 0;
    const totalNet = totalWage + additionVal + kasbonLoanVal;
    const newKasbonBalance = activeKasbon + kasbonLoanVal;

    const newSlip: SalarySlip = {
      id: `slip-${Date.now()}-${emp.id}`,
      slipNumber: generateInvoiceCode('SLIP'),
      periodStart: slipDate,
      periodEnd: slipDate,
      generatedDate: new Date().toISOString(),
      employeeId: emp.id,
      employeeName: emp.name,
      employeeRole: emp.role,
      daysPresent: 1,
      daysHalf: 0,
      daysOvertime: additionVal > 0 ? 1 : 0,
      totalOvertimeHours: 0,
      totalDailyWage: totalWage,
      totalOvertimePay: additionVal,
      allowance: 0,
      bonus: additionVal,
      deduction: 0,
      netSalary: totalNet,
      paymentStatus: 'Sudah Dibayar',
      notes: entry.notes.trim() || `Slip Gaji ${getDayNameID(slipDate)}, ${formatDate(slipDate)}`,
      kasbonOutstandingBefore: activeKasbon,
      kasbonRemainingAfter: newKasbonBalance,
    };

    onGenerateSalarySlip(newSlip);

    if (kasbonLoanVal > 0) {
      const kasbonLoanRecord: EmployeeKasbonRecord = {
        id: `ksb-loan-${newSlip.id}`,
        date: slipDate,
        employeeId: emp.id,
        employeeName: emp.name,
        type: 'pinjam',
        amount: kasbonLoanVal,
        remainingBalanceAfter: newKasbonBalance,
        notes: `Pinjaman kasbon harian via Slip Gaji #${newSlip.slipNumber}`,
        salarySlipId: newSlip.id,
        createdAt: new Date().toISOString(),
      };
      onSaveKasbon(kasbonLoanRecord);
    }

    setRiwayatEmpId(emp.id);
    setActiveTab('riwayat_gaji');
    setPayrollSuccessNotification(`Slip Gaji ${newSlip.slipNumber} (${emp.name}) berhasil disimpan & otomatis masuk ke Riwayat Gaji!`);
    setTimeout(() => setPayrollSuccessNotification(null), 5000);
  };

  // Batch Save all active employees' slips for selected slipDate
  const handleSaveAllSlips = () => {
    if (activeEmployees.length === 0) return;

    let savedCount = 0;
    activeEmployees.forEach(emp => {
      const entry = slipEntries[emp.id] || {
        wage: emp.dailyWage || 100000,
        addition: 0,
        kasbon: 0,
        notes: ''
      };

      const activeKasbon = getEmployeeOutstandingKasbon(emp.id);
      const totalWage = Number(entry.wage) || 0;
      const additionVal = Number(entry.addition) || 0;
      const kasbonLoanVal = Number(entry.kasbon) || 0;
      const totalNet = totalWage + additionVal + kasbonLoanVal;
      const newKasbonBalance = activeKasbon + kasbonLoanVal;

      const newSlip: SalarySlip = {
        id: `slip-${Date.now()}-${emp.id}`,
        slipNumber: generateInvoiceCode('SLIP'),
        periodStart: slipDate,
        periodEnd: slipDate,
        generatedDate: new Date().toISOString(),
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.role,
        daysPresent: 1,
        daysHalf: 0,
        daysOvertime: additionVal > 0 ? 1 : 0,
        totalOvertimeHours: 0,
        totalDailyWage: totalWage,
        totalOvertimePay: additionVal,
        allowance: 0,
        bonus: additionVal,
        deduction: 0,
        netSalary: totalNet,
        paymentStatus: 'Sudah Dibayar',
        notes: entry.notes.trim() || `Slip Gaji ${getDayNameID(slipDate)}, ${formatDate(slipDate)}`,
        kasbonOutstandingBefore: activeKasbon,
        kasbonRemainingAfter: newKasbonBalance,
      };

      onGenerateSalarySlip(newSlip);

      if (kasbonLoanVal > 0) {
        const kasbonLoanRecord: EmployeeKasbonRecord = {
          id: `ksb-loan-${newSlip.id}`,
          date: slipDate,
          employeeId: emp.id,
          employeeName: emp.name,
          type: 'pinjam',
          amount: kasbonLoanVal,
          remainingBalanceAfter: newKasbonBalance,
          notes: `Pinjaman kasbon harian via Slip Gaji #${newSlip.slipNumber}`,
          salarySlipId: newSlip.id,
          createdAt: new Date().toISOString(),
        };
        onSaveKasbon(kasbonLoanRecord);
      }
      savedCount++;
    });

    setActiveTab('riwayat_gaji');
    setPayrollSuccessNotification(`Berhasil menyimpan ${savedCount} Slip Gaji untuk tanggal ${getDayNameID(slipDate)}, ${formatDate(slipDate)}!`);
    setTimeout(() => setPayrollSuccessNotification(null), 5000);
  };

  // Filtered salary slips for History tab
  const filteredSalarySlips = useMemo(() => {
    return salarySlips.filter((slip) => {
      const slipDateStr = slip.periodStart || slip.generatedDate.substring(0, 10);
      if (historyFilterMode === 'single') {
        if (historyDateFilter && historyDateFilter !== 'ALL' && slipDateStr !== historyDateFilter) return false;
      } else if (historyFilterMode === 'range') {
        if (historyStartDate && slipDateStr < historyStartDate) return false;
        if (historyEndDate && slipDateStr > historyEndDate) return false;
      }
      // Check employee filter
      if (historyEmpFilter !== 'ALL' && slip.employeeId !== historyEmpFilter) {
        return false;
      }
      // Check search query
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchName = slip.employeeName.toLowerCase().includes(q);
        const matchNumber = slip.slipNumber.toLowerCase().includes(q);
        const matchRole = slip.employeeRole.toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchRole) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime());
  }, [salarySlips, historyFilterMode, historyDateFilter, historyStartDate, historyEndDate, historyEmpFilter, historySearch]);

  // Report stats for history tab
  const reportStats = useMemo(() => {
    const totalTHP = filteredSalarySlips.reduce((sum, s) => sum + s.netSalary, 0);
    const totalDailyWage = filteredSalarySlips.reduce((sum, s) => sum + s.totalDailyWage, 0);
    const totalBonus = filteredSalarySlips.reduce((sum, s) => sum + (s.bonus || s.totalOvertimePay || 0), 0);
    const totalDeduction = filteredSalarySlips.reduce((sum, s) => sum + s.deduction, 0);

    return {
      totalTHP,
      totalDailyWage,
      totalBonus,
      totalDeduction,
      count: filteredSalarySlips.length
    };
  }, [filteredSalarySlips]);

  // Riwayat Preview Slip States (Rentang Tanggal & Karyawan)
  const [riwayatEmpId, setRiwayatEmpId] = useState<string>(employees[0]?.id || '');
  const [riwayatStartDate, setRiwayatStartDate] = useState<string>(todayStr);
  const [riwayatEndDate, setRiwayatEndDate] = useState<string>(todayStr);
  const [riwayatCustomKasbon, setRiwayatCustomKasbon] = useState<number>(0);

  const selectedEmpForRiwayat = employees.find(e => e.id === riwayatEmpId);
  const employeeSlipsInRange = useMemo(() => {
    if (!riwayatEmpId) return [];
    return salarySlips.filter(s => {
      if (s.employeeId !== riwayatEmpId) return false;
      const d = s.periodStart || s.generatedDate.substring(0, 10);
      return d >= riwayatStartDate && d <= riwayatEndDate;
    });
  }, [salarySlips, riwayatEmpId, riwayatStartDate, riwayatEndDate]);

  const aggregatedRiwayat = useMemo(() => {
    let totalWage = 0;
    let totalAddition = 0;
    employeeSlipsInRange.forEach(s => {
      totalWage += s.totalDailyWage || 0;
      totalAddition += (s.bonus || s.totalOvertimePay || 0);
    });
    const outstandingKasbon = getEmployeeOutstandingKasbon(riwayatEmpId);
    const deduction = riwayatCustomKasbon !== undefined ? riwayatCustomKasbon : Math.min(outstandingKasbon, totalWage + totalAddition);
    const totalNet = Math.max(0, totalWage + totalAddition - deduction);
    return {
      totalWage,
      totalAddition,
      outstandingKasbon,
      deduction,
      totalNet,
      count: employeeSlipsInRange.length
    };
  }, [employeeSlipsInRange, riwayatEmpId, riwayatCustomKasbon]);

  const handlePrintRiwayatSlip = () => {
    if (!selectedEmpForRiwayat) return;
    const remainingAfter = Math.max(0, aggregatedRiwayat.outstandingKasbon - aggregatedRiwayat.deduction);
    const slipToPrint: SalarySlip = {
      id: `slip-riwayat-${Date.now()}`,
      slipNumber: generateInvoiceCode('SLIP'),
      periodStart: riwayatStartDate,
      periodEnd: riwayatEndDate,
      generatedDate: new Date().toISOString(),
      employeeId: selectedEmpForRiwayat.id,
      employeeName: selectedEmpForRiwayat.name,
      employeeRole: selectedEmpForRiwayat.role,
      daysPresent: aggregatedRiwayat.count || 1,
      daysHalf: 0,
      daysOvertime: 0,
      totalOvertimeHours: 0,
      totalDailyWage: aggregatedRiwayat.totalWage,
      totalOvertimePay: aggregatedRiwayat.totalAddition,
      allowance: 0,
      bonus: aggregatedRiwayat.totalAddition,
      deduction: aggregatedRiwayat.deduction,
      netSalary: aggregatedRiwayat.totalNet,
      paymentStatus: 'Sudah Dibayar',
      notes: '',
      kasbonOutstandingBefore: aggregatedRiwayat.outstandingKasbon,
      kasbonRemainingAfter: remainingAfter,
    };
    onPrintSalarySlip(slipToPrint);

    if (aggregatedRiwayat.deduction > 0) {
      const kasbonRepayRecord: EmployeeKasbonRecord = {
        id: `ksb-pay-riwayat-${Date.now()}`,
        date: riwayatEndDate,
        employeeId: selectedEmpForRiwayat.id,
        employeeName: selectedEmpForRiwayat.name,
        type: 'bayar_slip',
        amount: aggregatedRiwayat.deduction,
        remainingBalanceAfter: remainingAfter,
        notes: `Potongan kasbon via Slip Gaji Mingguan #${slipToPrint.slipNumber}`,
        salarySlipId: slipToPrint.id,
        createdAt: new Date().toISOString(),
      };
      onSaveKasbon(kasbonRepayRecord);
    }
  };

  // Employee Management Modal State
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [newEmpCode, setNewEmpCode] = useState(`EMP-${employees.length + 1}`);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<string>('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpDailyWage, setNewEmpDailyWage] = useState<number>(100000);
  const [newEmpStatus, setNewEmpStatus] = useState<'Aktif' | 'Non-Aktif'>('Aktif');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

  const handleOpenAddEmployee = () => {
    setEditingEmployeeId(null);
    setNewEmpCode(`EMP-${employees.length + 1}`);
    setNewEmpName('');
    setNewEmpRole('');
    setNewEmpPhone('');
    setNewEmpDailyWage(100000);
    setNewEmpStatus('Aktif');
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setNewEmpCode(emp.code);
    setNewEmpName(emp.name);
    setNewEmpRole(emp.role);
    setNewEmpPhone(emp.phone || '');
    setNewEmpDailyWage(emp.dailyWage);
    setNewEmpStatus(emp.status || 'Aktif');
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployeeForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpRole.trim()) return;

    const savedEmp: Employee = {
      id: editingEmployeeId || `emp-${Date.now()}`,
      code: newEmpCode,
      name: newEmpName.trim(),
      role: newEmpRole.trim(),
      phone: newEmpPhone.trim(),
      dailyWage: newEmpDailyWage,
      standardOvertimeRate: 20000,
      status: newEmpStatus,
    };

    onSaveEmployee(savedEmp);
    setIsEmployeeModalOpen(false);
  };

  // Kasbon Loan / Repayment Modals State
  const [kasbonFilterEmpId, setKasbonFilterEmpId] = useState<string>('ALL');
  const [kasbonSearchQuery, setKasbonSearchQuery] = useState<string>('');
  const [isAddKasbonModalOpen, setIsAddKasbonModalOpen] = useState(false);
  const [addKasbonEmpId, setAddKasbonEmpId] = useState<string>('');
  const [addKasbonDate, setAddKasbonDate] = useState<string>(todayStr);
  const [addKasbonAmount, setAddKasbonAmount] = useState<number>(100000);
  const [addKasbonNotes, setAddKasbonNotes] = useState<string>('');

  const [isManualRepayModalOpen, setIsManualRepayModalOpen] = useState(false);
  const [manualRepayEmpId, setManualRepayEmpId] = useState<string>('');
  const [manualRepayDate, setManualRepayDate] = useState<string>(todayStr);
  const [manualRepayAmount, setManualRepayAmount] = useState<number>(50000);
  const [manualRepayNotes, setManualRepayNotes] = useState<string>('');

  // Overview stats for kasbon
  const kasbonOverview = useMemo(() => {
    let totalActiveDebt = 0;
    let totalBorrowedAll = 0;
    let totalRepaidAll = 0;
    const empWithKasbon = new Set<string>();

    employees.forEach(emp => {
      const balance = getEmployeeOutstandingKasbon(emp.id);
      if (balance > 0) {
        totalActiveDebt += balance;
        empWithKasbon.add(emp.id);
      }
    });

    kasbonRecords.forEach(k => {
      if (k.type === 'pinjam') totalBorrowedAll += Number(k.amount) || 0;
      if (k.type === 'bayar_slip' || k.type === 'bayar_manual') totalRepaidAll += Number(k.amount) || 0;
    });

    return {
      totalActiveDebt,
      empCount: empWithKasbon.size,
      totalBorrowedAll,
      totalRepaidAll
    };
  }, [employees, kasbonRecords]);

  // Filtered kasbon records
  const filteredKasbonRecords = useMemo(() => {
    return kasbonRecords.filter(rec => {
      if (kasbonFilterEmpId !== 'ALL' && rec.employeeId !== kasbonFilterEmpId) return false;
      if (kasbonSearchQuery.trim()) {
        const q = kasbonSearchQuery.toLowerCase();
        const matchName = rec.employeeName.toLowerCase().includes(q);
        const matchNotes = (rec.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchNotes) return false;
      }
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [kasbonRecords, kasbonFilterEmpId, kasbonSearchQuery]);

  const handleOpenAddKasbon = (empId?: string) => {
    setAddKasbonEmpId(empId || employees[0]?.id || '');
    setAddKasbonDate(todayStr);
    setAddKasbonAmount(100000);
    setAddKasbonNotes('');
    setIsAddKasbonModalOpen(true);
  };

  const handleSubmitAddKasbon = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === addKasbonEmpId);
    if (!emp || addKasbonAmount <= 0) return;

    const currentBalance = getEmployeeOutstandingKasbon(emp.id);
    const newBalance = currentBalance + addKasbonAmount;

    const newRecord: EmployeeKasbonRecord = {
      id: `ksb-loan-${Date.now()}`,
      date: addKasbonDate,
      employeeId: emp.id,
      employeeName: emp.name,
      type: 'pinjam',
      amount: addKasbonAmount,
      remainingBalanceAfter: newBalance,
      notes: addKasbonNotes.trim() || 'Pinjaman / kasbon karyawan',
      createdAt: new Date().toISOString(),
    };

    onSaveKasbon(newRecord);
    setIsAddKasbonModalOpen(false);
  };

  const handleOpenManualRepay = (empId?: string) => {
    const targetEmpId = empId || employees.find(e => getEmployeeOutstandingKasbon(e.id) > 0)?.id || employees[0]?.id || '';
    const currentBalance = getEmployeeOutstandingKasbon(targetEmpId);
    setManualRepayEmpId(targetEmpId);
    setManualRepayDate(todayStr);
    setManualRepayAmount(Math.min(50000, currentBalance || 50000));
    setManualRepayNotes('');
    setIsManualRepayModalOpen(true);
  };

  const handleSubmitManualRepay = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === manualRepayEmpId);
    if (!emp || manualRepayAmount <= 0) return;

    const currentBalance = getEmployeeOutstandingKasbon(emp.id);
    const newBalance = Math.max(0, currentBalance - manualRepayAmount);

    const newRecord: EmployeeKasbonRecord = {
      id: `ksb-repay-${Date.now()}`,
      date: manualRepayDate,
      employeeId: emp.id,
      employeeName: emp.name,
      type: 'bayar_manual',
      amount: manualRepayAmount,
      remainingBalanceAfter: newBalance,
      notes: manualRepayNotes.trim() || 'Pelunasan kasbon tunai/manual',
      createdAt: new Date().toISOString(),
    };

    onSaveKasbon(newRecord);
    setIsManualRepayModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/60 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('buat_slip')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'buat_slip'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>1. Input Slip Gaji</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('riwayat_gaji')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'riwayat_gaji'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>2. Riwayat Slip Gaji</span>
            {salarySlips.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'riwayat_gaji' ? 'bg-amber-800 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {salarySlips.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kasbon')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'kasbon'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <WalletCards className="w-4 h-4 text-amber-500" />
            <span>3. Data Kasbon Karyawan</span>
            {kasbonOverview.empCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'kasbon' ? 'bg-amber-800 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {kasbonOverview.empCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('karyawan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'karyawan'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>4. Data Karyawan ({employees.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-600 font-medium px-2 hidden sm:block">
          Modul: <span className="font-bold text-slate-900">Penggajian & Slip Gaji Karyawan</span>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION BANNER */}
      {payrollSuccessNotification && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-md flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            <span>{payrollSuccessNotification}</span>
          </div>
          <button
            onClick={() => setPayrollSuccessNotification(null)}
            className="p-1 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer text-emerald-100 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: INPUT SLIP GAJI */}
      {activeTab === 'buat_slip' && (
        <div className="space-y-4">
          
          {/* Header Controls: Date & Search */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block">Pilih Tanggal Slip Gaji:</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="date"
                    value={slipDate}
                    onChange={(e) => setSlipDate(e.target.value)}
                    className="p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="text-xs font-bold text-amber-900 bg-amber-100/90 px-3 py-1.5 rounded-lg border border-amber-300 font-mono">
                    {getDayNameID(slipDate)}, {formatDateDDNopYYYY(slipDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama / bagian karyawan..."
                  value={slipSearchQuery}
                  onChange={(e) => setSlipSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Table / Batch Entry */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-md overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  SLIP GAJI KARYAWAN
                </h3>
                <span className="text-xs font-bold text-amber-900 font-mono block mt-0.5">
                  {getDayNameID(slipDate)}, {formatDateDDNopYYYY(slipDate)}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Total Karyawan Aktif: <strong className="text-slate-900">{filteredActiveEmployees.length} orang</strong>
              </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Nama Karyawan</th>
                    <th className="py-2.5 px-3 text-right">Gaji</th>
                    <th className="py-2.5 px-3 text-right">Tambahan</th>
                    <th className="py-2.5 px-3 text-right">Kasbon</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActiveEmployees.map((emp) => {
                    const entry = slipEntries[emp.id] || { wage: emp.dailyWage || 100000, addition: 0, kasbon: 0, notes: '' };
                    const activeKasbon = getEmployeeOutstandingKasbon(emp.id);
                    const totalWage = Number(entry.wage) || 0;
                    const additionVal = Number(entry.addition) || 0;
                    const kasbonVal = Number(entry.kasbon) || 0;
                    const totalNet = totalWage + additionVal + kasbonVal;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80">
                        {/* 1. Nama Karyawan */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 block">{emp.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-medium">{emp.role} ({emp.code})</span>
                              {activeKasbon > 0 && (
                                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded-full font-mono font-bold">
                                  Kasbon: {formatCurrency(activeKasbon)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Gaji */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={entry.wage === 0 ? '' : entry.wage.toLocaleString('id-ID')}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = raw === '' ? 0 : parseFloat(raw) || 0;
                              setSlipEntries(prev => ({
                                ...prev,
                                [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), wage: val }
                              }));
                            }}
                            className="w-32 text-right p-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          />
                        </td>

                        {/* 3. Tambahan */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={entry.addition === 0 ? '' : entry.addition.toLocaleString('id-ID')}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = raw === '' ? 0 : parseFloat(raw) || 0;
                              setSlipEntries(prev => ({
                                ...prev,
                                [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), addition: val }
                              }));
                            }}
                            className="w-32 text-right p-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-blue-700 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          />
                        </td>

                        {/* 4. Kasbon */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="space-y-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={entry.kasbon === 0 ? '' : entry.kasbon.toLocaleString('id-ID')}
                              placeholder="0"
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                                const val = raw === '' ? 0 : parseFloat(raw) || 0;
                                setSlipEntries(prev => ({
                                  ...prev,
                                  [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), kasbon: val }
                                }));
                              }}
                              className="w-32 text-right p-1.5 text-xs font-mono font-bold bg-white border border-rose-300 rounded-lg text-rose-700 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            />
                            {activeKasbon > 0 && (
                              <div className="flex items-center justify-end gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const full = Math.min(activeKasbon, totalWage + additionVal);
                                    setSlipEntries(prev => ({
                                      ...prev,
                                      [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), kasbon: full }
                                    }));
                                  }}
                                  className="text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded font-bold cursor-pointer border border-amber-200"
                                >
                                  Potong {formatCurrency(Math.min(activeKasbon, totalWage + additionVal))}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlipEntries(prev => ({
                                      ...prev,
                                      [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), kasbon: 0 }
                                    }));
                                  }}
                                  className="text-slate-500 hover:text-slate-700 px-1 py-0.5 cursor-pointer"
                                >
                                  Rp 0
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. Total (Gaji + Tambahan - Kasbon) */}
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-700 text-sm">
                          {formatCurrency(totalNet)}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredActiveEmployees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada karyawan aktif yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="block sm:hidden divide-y divide-slate-100 p-2.5 space-y-3">
              {filteredActiveEmployees.map((emp) => {
                const entry = slipEntries[emp.id] || { wage: emp.dailyWage || 100000, addition: 0, kasbon: 0, notes: '' };
                const activeKasbon = getEmployeeOutstandingKasbon(emp.id);
                const totalWage = Number(entry.wage) || 0;
                const additionVal = Number(entry.addition) || 0;
                const kasbonVal = Number(entry.kasbon) || 0;
                const totalNet = totalWage + additionVal + kasbonVal;

                return (
                  <div key={emp.id} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{emp.name}</span>
                        <span className="text-[10px] text-slate-500">{emp.role} ({emp.code})</span>
                      </div>
                      {activeKasbon > 0 && (
                        <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-mono font-bold">
                          Kasbon: {formatCurrency(activeKasbon)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block">Gaji:</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.wage === 0 ? '' : entry.wage.toLocaleString('id-ID')}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            const val = raw === '' ? 0 : parseFloat(raw) || 0;
                            setSlipEntries(prev => ({
                              ...prev,
                              [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), wage: val }
                            }));
                          }}
                          className="w-full text-right p-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block">Tambahan:</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.addition === 0 ? '' : entry.addition.toLocaleString('id-ID')}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            const val = raw === '' ? 0 : parseFloat(raw) || 0;
                            setSlipEntries(prev => ({
                              ...prev,
                              [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), addition: val }
                            }));
                          }}
                          className="w-full text-right p-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-blue-700"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-semibold text-rose-700 block">Kasbon:</label>
                        {activeKasbon > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const full = Math.min(activeKasbon, totalWage + additionVal);
                              setSlipEntries(prev => ({
                                ...prev,
                                [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), kasbon: full }
                              }));
                            }}
                            className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                          >
                            Potong {formatCurrency(Math.min(activeKasbon, totalWage + additionVal))}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={entry.kasbon === 0 ? '' : entry.kasbon.toLocaleString('id-ID')}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                          const val = raw === '' ? 0 : parseFloat(raw) || 0;
                          setSlipEntries(prev => ({
                            ...prev,
                            [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), kasbon: val }
                          }));
                        }}
                        className="w-full text-right p-1.5 text-xs font-mono font-bold bg-slate-50 border border-rose-300 rounded-lg text-rose-700"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Total:</span>
                        <span className="font-mono font-bold text-emerald-700 text-base">{formatCurrency(totalNet)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch Summary Footer & Simpan Semua Button */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                TOTAL GAJI BERSIH DIBAYAR:
              </span>
              <span className="text-2xl font-bold font-mono text-amber-400 block">
                {formatCurrency(batchSummary.totalNet)}
              </span>
            </div>

            <button
              type="button"
              disabled={activeEmployees.length === 0}
              onClick={handleSaveAllSlips}
              className={`px-6 py-3 font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 ${
                activeEmployees.length === 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Simpan Semua Slip Gaji ({activeEmployees.length} Karyawan)</span>
            </button>
          </div>

        </div>
      )}

      {/* TAB 2: RIWAYAT SLIP GAJI (Direct Preview Slip dengan Filter Rentang Tanggal & Nama Karyawan) */}
      {activeTab === 'riwayat_gaji' && (
        <div className="space-y-4">
          
          {/* Filter Toolbar: Rentang Tanggal & Nama Karyawan */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Karyawan:</label>
                <select
                  value={riwayatEmpId}
                  onChange={(e) => setRiwayatEmpId(e.target.value)}
                  className="p-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-xs min-w-[200px]"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dari Tanggal:</label>
                  <input
                    type="date"
                    value={riwayatStartDate}
                    onChange={(e) => setRiwayatStartDate(e.target.value)}
                    className="p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sampai Tanggal:</label>
                  <input
                    type="date"
                    value={riwayatEndDate}
                    onChange={(e) => setRiwayatEndDate(e.target.value)}
                    className="p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {selectedEmpForRiwayat && (
              <button
                type="button"
                onClick={handlePrintRiwayatSlip}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Cetak Slip Gaji (Preview)</span>
              </button>
            )}
          </div>

          {/* Direct Preview Slip Card */}
          {selectedEmpForRiwayat ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
              
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">{storeName}</h2>
                  <p className="text-xs text-slate-500">Slip Gaji Karyawan Mingguan / Periode</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    SLIP GAJI RESMI
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Periode: {formatDate(riwayatStartDate)} s/d {formatDate(riwayatEndDate)}
                  </p>
                </div>
              </div>

              {/* Employee Details Info */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Karyawan:</span>
                  <strong className="text-slate-900 font-bold">{selectedEmpForRiwayat.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bagian / Jabatan:</span>
                  <span className="text-slate-800 font-medium">{selectedEmpForRiwayat.role} ({selectedEmpForRiwayat.code})</span>
                </div>
              </div>

              {/* Breakdown Table matching input slip format: Gaji Pokok, Tambahan, Kasbon, Total Gaji Bersih */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <div className="bg-slate-900 text-white px-4 py-2.5 font-bold uppercase tracking-wider text-xs">
                  RINCIAN GAJI
                </div>
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-slate-200 font-medium text-xs">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">Gaji Pokok:</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(aggregatedRiwayat.totalWage)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-blue-700">Tambahan:</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">+{formatCurrency(aggregatedRiwayat.totalAddition)}</td>
                    </tr>
                    <tr className="hover:bg-rose-50/50">
                      <td className="py-3 px-4 font-bold text-rose-700">
                        <div>Kasbon:</div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">Sisa Saldo Kasbon Karyawan: {formatCurrency(aggregatedRiwayat.outstandingKasbon)}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={riwayatCustomKasbon === 0 ? '' : riwayatCustomKasbon.toLocaleString('id-ID')}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = raw === '' ? 0 : parseFloat(raw) || 0;
                              setRiwayatCustomKasbon(val);
                            }}
                            className="w-32 text-right p-1.5 text-xs font-mono font-bold bg-white border border-rose-300 rounded-lg text-rose-700 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setRiwayatCustomKasbon(Math.min(aggregatedRiwayat.outstandingKasbon, aggregatedRiwayat.totalWage + aggregatedRiwayat.totalAddition))}
                            className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 rounded font-bold cursor-pointer"
                          >
                            Potong Penuh
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-emerald-900 text-white font-bold text-sm">
                    <tr>
                      <td className="py-3.5 px-4 font-extrabold text-white">Total Gaji Bersih:</td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-300 text-base">
                        {formatCurrency(aggregatedRiwayat.totalNet)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Action Print Button inside preview */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handlePrintRiwayatSlip}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Cetak Slip Gaji Resmi</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-xs">
              Silakan pilih karyawan terlebih dahulu.
            </div>
          )}

        </div>
      )}

      {/* TAB 3: DATA KASBON KARYAWAN */}
      {activeTab === 'kasbon' && (
        <div className="space-y-4">
          {/* Kasbon Summary Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-xs space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Kasbon Belum Lunas:</span>
              <span className="font-mono font-extrabold text-rose-700 text-base sm:text-lg block">
                {formatCurrency(kasbonOverview.totalActiveDebt)}
              </span>
              <span className="text-[10px] text-slate-500 block">{kasbonOverview.empCount} karyawan menunggak</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-xs space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Akumulasi Pinjaman:</span>
              <span className="font-mono font-bold text-amber-800 text-base sm:text-lg block">
                {formatCurrency(kasbonOverview.totalBorrowedAll)}
              </span>
              <span className="text-[10px] text-slate-500 block">Total pinjaman tercatat</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-xs space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Akumulasi Pelunasan:</span>
              <span className="font-mono font-bold text-emerald-700 text-base sm:text-lg block">
                {formatCurrency(kasbonOverview.totalRepaidAll)}
              </span>
              <span className="text-[10px] text-slate-500 block">Potongan slip + bayar tunai</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Aksi Kasbon:</span>
              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenAddKasbon()}
                  className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pinjam Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenManualRepay()}
                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Bayar Tunai</span>
                </button>
              </div>
            </div>
          </div>

          {/* Kasbon Table & Ledger */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-md overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Buku Catatan Kasbon & Pelunasan Karyawan
                </h3>
                <p className="text-[11px] text-slate-500">
                  Riwayat pinjaman kasbon baru dan pelunasan (baik potongan slip gaji maupun setor tunai)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={kasbonFilterEmpId}
                  onChange={(e) => setKasbonFilterEmpId(e.target.value)}
                  className="p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="ALL">Semua Karyawan</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Karyawan</th>
                    <th className="py-2.5 px-3 text-center">Jenis Transaksi</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-right">Sisa Kasbon Karyawan</th>
                    <th className="py-2.5 px-3">Keterangan / Catatan</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKasbonRecords.map((rec) => {
                    const isPinjam = rec.type === 'pinjam';

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{formatDate(rec.date)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{rec.employeeName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPinjam ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isPinjam ? '🔴 Pinjam Kasbon Baru' : rec.type === 'bayar_slip' ? '🟢 Potongan Slip Gaji' : '🟢 Bayar Tunai Manual'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                          isPinjam ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          {isPinjam ? `+${formatCurrency(rec.amount)}` : `-${formatCurrency(rec.amount)}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(rec.remainingBalanceAfter)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs truncate">{rec.notes}</td>
                        <td className="py-2.5 px-3 text-center">
                          {userRole === 'admin' && (
                            <button
                              type="button"
                              onClick={() => onDeleteKasbon(rec.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Hapus catatan kasbon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredKasbonRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada catatan transaksi kasbon karyawan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DATA KARYAWAN & UPAH HARIAN */}
      {activeTab === 'karyawan' && (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daftar Karyawan Usaha ({employees.length} Orang)
              </h3>
              <p className="text-[11px] text-slate-500">
                Kelola data profil karyawan, posisi kerja, dan besaran gaji pokok/harian standar
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddEmployee}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Karyawan Baru</span>
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Kode & Nama Karyawan</th>
                    <th className="py-2.5 px-3">Bagian / Peran</th>
                    <th className="py-2.5 px-3">No. HP / WhatsApp</th>
                    <th className="py-2.5 px-3 text-right">Gaji Pokok / Harian</th>
                    <th className="py-2.5 px-3 text-right">Saldo Kasbon Aktif</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const activeKasbon = getEmployeeOutstandingKasbon(emp.id);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{emp.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{emp.code}</span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{emp.role}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">{emp.phone || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(emp.dailyWage)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {activeKasbon > 0 ? (
                            <span className="text-rose-700 font-bold">{formatCurrency(activeKasbon)}</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Rp 0 (Lunas)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'Aktif' || !emp.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {emp.status || 'Aktif'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEmployee(emp)}
                            className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT KARYAWAN */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingEmployeeId ? 'Edit Profile Karyawan' : 'Daftarkan Karyawan Baru'}
              </h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveEmployeeForm} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Karyawan:</label>
                <input
                  type="text"
                  value={newEmpCode}
                  onChange={(e) => setNewEmpCode(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Karyawan *:</label>
                <input
                  type="text"
                  placeholder="Contoh: Danu"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bagian / Peran Kerja *:</label>
                <input
                  type="text"
                  placeholder="Contoh: Katering / Potong / Sopir Armada"
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. HP / WhatsApp (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Gaji Pokok Standar (Rp):</label>
                <input
                  type="number"
                  value={newEmpDailyWage}
                  onChange={(e) => setNewEmpDailyWage(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Karyawan:</label>
                <select
                  value={newEmpStatus}
                  onChange={(e) => setNewEmpStatus(e.target.value as 'Aktif' | 'Non-Aktif')}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non-Aktif">Non-Aktif</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PINJAM KASBON BARU */}
      {isAddKasbonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Catat Pinjaman Kasbon Baru</h3>
              <button onClick={() => setIsAddKasbonModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitAddKasbon} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Karyawan:</label>
                <select
                  value={addKasbonEmpId}
                  onChange={(e) => setAddKasbonEmpId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Pinjam:</label>
                <input
                  type="date"
                  value={addKasbonDate}
                  onChange={(e) => setAddKasbonDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal Kasbon (Rp):</label>
                <input
                  type="number"
                  value={addKasbonAmount}
                  onChange={(e) => setAddKasbonAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-rose-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan / Keterangan:</label>
                <input
                  type="text"
                  placeholder="Misal: Pinjam uang bensin / keperluan mendesak"
                  value={addKasbonNotes}
                  onChange={(e) => setAddKasbonNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddKasbonModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Pinjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PELUNASAN KASBON MANUAL TUNAI */}
      {isManualRepayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Catat Pelunasan Kasbon Tunai</h3>
              <button onClick={() => setIsManualRepayModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitManualRepay} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Karyawan:</label>
                <select
                  value={manualRepayEmpId}
                  onChange={(e) => setManualRepayEmpId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} (Kasbon: {formatCurrency(getEmployeeOutstandingKasbon(e.id))})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Bayar:</label>
                <input
                  type="date"
                  value={manualRepayDate}
                  onChange={(e) => setManualRepayDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal Setor Tunai (Rp):</label>
                <input
                  type="number"
                  value={manualRepayAmount}
                  onChange={(e) => setManualRepayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan / Keterangan:</label>
                <input
                  type="text"
                  placeholder="Misal: Titip bayar tunai ke kasir"
                  value={manualRepayNotes}
                  onChange={(e) => setManualRepayNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsManualRepayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Setor Tunai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS SLIP GAJI */}
      {slipToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Slip Gaji?</h3>
                <p className="text-xs text-slate-500">Potongan kasbon terkait (jika ada) akan dikembalikan ke saldo kasbon karyawan</p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-700 font-mono">
                <span>No. Slip:</span>
                <span className="font-bold">{slipToDelete.slipNumber}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Karyawan:</span>
                <span className="font-semibold">{slipToDelete.employeeName}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-mono">
                <span>Total Gaji Diterima:</span>
                <span className="font-bold text-rose-700">{formatCurrency(slipToDelete.netSalary)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSlipToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSalarySlip && slipToDelete) {
                    onDeleteSalarySlip(slipToDelete.id);
                  }
                  setSlipToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                Ya, Hapus Slip
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
