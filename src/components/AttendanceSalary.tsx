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
  Edit3,
  Lock,
  RotateCcw
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
  onDeleteEmployee?: (id: string) => void;
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
  onDeleteEmployee,
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

  // Excluded (absent) employee IDs per date so admin doesn't need to leave empty inputs
  const [excludedEmpIdsByDate, setExcludedEmpIdsByDate] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('ayamku_excluded_slip_emps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ayamku_excluded_slip_emps', JSON.stringify(excludedEmpIdsByDate));
    } catch {
      // Ignore storage quota issues
    }
  }, [excludedEmpIdsByDate]);

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

  // Map of employeeId -> existing daily slip for selected slipDate
  const existingSlipsByEmpForDate = useMemo(() => {
    const map: Record<string, SalarySlip> = {};
    salarySlips.forEach(s => {
      const start = s.periodStart || s.generatedDate.substring(0, 10);
      const end = s.periodEnd || s.generatedDate.substring(0, 10);
      if (start === slipDate && end === slipDate) {
        map[s.employeeId] = s;
      }
    });
    return map;
  }, [salarySlips, slipDate]);

  const savedSlipsCountForDate = Object.keys(existingSlipsByEmpForDate).length;
  const hasSavedSlipsForDate = savedSlipsCountForDate > 0;

  const excludedIdsForDate = excludedEmpIdsByDate[slipDate] || [];

  // Active employees not deleted/excluded on selected slipDate
  const includedActiveEmployees = useMemo(() => {
    return activeEmployees.filter(emp => !excludedIdsForDate.includes(emp.id));
  }, [activeEmployees, excludedIdsForDate]);

  // Filtered active employees for slip entry search
  const filteredActiveEmployees = useMemo(() => {
    if (!slipSearchQuery.trim()) return includedActiveEmployees;
    const q = slipSearchQuery.toLowerCase();
    return includedActiveEmployees.filter(emp => 
      emp.name.toLowerCase().includes(q) || emp.role.toLowerCase().includes(q) || emp.code.toLowerCase().includes(q)
    );
  }, [includedActiveEmployees, slipSearchQuery]);

  const handleExcludeEmployeeForDate = (empId: string) => {
    if (hasSavedSlipsForDate) return;
    setExcludedEmpIdsByDate(prev => {
      const current = prev[slipDate] || [];
      if (current.includes(empId)) return prev;
      return { ...prev, [slipDate]: [...current, empId] };
    });
  };

  const handleRestoreAllForDate = () => {
    if (hasSavedSlipsForDate) return;
    setExcludedEmpIdsByDate(prev => {
      const next = { ...prev };
      delete next[slipDate];
      return next;
    });
  };

  // Initialize/Sync slip entries whenever slipDate, activeEmployees, or salarySlips change
  useEffect(() => {
    const mapped: Record<string, { wage: number; addition: number; kasbon: number; notes: string }> = {};

    employees.forEach(emp => {
      const existingSlip = existingSlipsByEmpForDate[emp.id];

      if (existingSlip) {
        mapped[emp.id] = {
          wage: existingSlip.totalDailyWage,
          addition: existingSlip.bonus || existingSlip.totalOvertimePay || 0,
          kasbon: existingSlip.deduction || 0,
          notes: existingSlip.notes || '',
        };
      } else {
        mapped[emp.id] = {
          wage: 0,
          addition: 0,
          kasbon: 0,
          notes: '',
        };
      }
    });

    setSlipEntries(mapped);
  }, [slipDate, employees, existingSlipsByEmpForDate]);

  // Batch summary totals for included slip entries on selected date
  const batchSummary = useMemo(() => {
    let totalWage = 0;
    let totalAddition = 0;
    let totalKasbon = 0;
    let totalNet = 0;

    includedActiveEmployees.forEach(emp => {
      const entry = slipEntries[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' };
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
  }, [includedActiveEmployees, slipEntries]);

  // Save single employee slip
  const handleSaveSingleSlip = (emp: Employee) => {
    if (existingSlipsByEmpForDate[emp.id]) return;

    const entry = slipEntries[emp.id] || {
      wage: 0,
      addition: 0,
      kasbon: 0,
      notes: ''
    };

    const activeKasbon = getEmployeeOutstandingKasbon(emp.id);
    const totalWage = Number(entry.wage) || 0;
    const additionVal = Number(entry.addition) || 0;
    const kasbonVal = Number(entry.kasbon) || 0;
    const totalNet = Math.max(0, totalWage + additionVal - kasbonVal);
    const newKasbonBalance = Math.max(0, activeKasbon - kasbonVal);

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
      deduction: kasbonVal,
      netSalary: totalNet,
      paymentStatus: 'Sudah Dibayar',
      notes: entry.notes.trim() || `Slip Gaji ${getDayNameID(slipDate)}, ${formatDate(slipDate)}`,
      kasbonOutstandingBefore: activeKasbon,
      kasbonRemainingAfter: newKasbonBalance,
    };

    onGenerateSalarySlip(newSlip);

    if (kasbonVal > 0) {
      const kasbonPaymentRecord: EmployeeKasbonRecord = {
        id: `ksb-slip-${newSlip.id}`,
        date: slipDate,
        employeeId: emp.id,
        employeeName: emp.name,
        type: 'bayar_slip',
        amount: kasbonVal,
        remainingBalanceAfter: newKasbonBalance,
        notes: `Potong kasbon via Slip Gaji #${newSlip.slipNumber}`,
        salarySlipId: newSlip.id,
        createdAt: new Date().toISOString(),
      };
      onSaveKasbon(kasbonPaymentRecord);
    }

    setRiwayatEmpId(emp.id);
    setActiveTab('riwayat_gaji');
    setPayrollSuccessNotification(`Slip Gaji ${newSlip.slipNumber} (${emp.name}) berhasil disimpan & otomatis masuk ke Riwayat Gaji!`);
    setTimeout(() => setPayrollSuccessNotification(null), 5000);
  };

  // Batch Save all included employees' slips for selected slipDate (strictly prevents re-saving same date)
  const handleSaveAllSlips = () => {
    if (hasSavedSlipsForDate || includedActiveEmployees.length === 0) return;

    let savedCount = 0;
    includedActiveEmployees.forEach(emp => {
      if (existingSlipsByEmpForDate[emp.id]) return;

      const entry = slipEntries[emp.id] || {
        wage: 0,
        addition: 0,
        kasbon: 0,
        notes: ''
      };

      const activeKasbon = getEmployeeOutstandingKasbon(emp.id);
      const totalWage = Number(entry.wage) || 0;
      const additionVal = Number(entry.addition) || 0;
      const kasbonVal = Number(entry.kasbon) || 0;
      const totalNet = Math.max(0, totalWage + additionVal - kasbonVal);
      const newKasbonBalance = Math.max(0, activeKasbon - kasbonVal);

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
        deduction: kasbonVal,
        netSalary: totalNet,
        paymentStatus: 'Sudah Dibayar',
        notes: entry.notes.trim() || `Slip Gaji ${getDayNameID(slipDate)}, ${formatDate(slipDate)}`,
        kasbonOutstandingBefore: activeKasbon,
        kasbonRemainingAfter: newKasbonBalance,
      };

      onGenerateSalarySlip(newSlip);

      if (kasbonVal > 0) {
        const kasbonPaymentRecord: EmployeeKasbonRecord = {
          id: `ksb-slip-${newSlip.id}`,
          date: slipDate,
          employeeId: emp.id,
          employeeName: emp.name,
          type: 'bayar_slip',
          amount: kasbonVal,
          remainingBalanceAfter: newKasbonBalance,
          notes: `Potong kasbon via Slip Gaji #${newSlip.slipNumber}`,
          salarySlipId: newSlip.id,
          createdAt: new Date().toISOString(),
        };
        onSaveKasbon(kasbonPaymentRecord);
      }
      savedCount++;
    });

    if (savedCount > 0) {
      setActiveTab('riwayat_gaji');
      setPayrollSuccessNotification(`Berhasil menyimpan ${savedCount} Slip Gaji untuk tanggal ${getDayNameID(slipDate)}, ${formatDate(slipDate)}!`);
      setTimeout(() => setPayrollSuccessNotification(null), 5000);
    }
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
    let totalKasbon = 0;
    let daysPresentCount = 0;

    employeeSlipsInRange.forEach(s => {
      const w = s.totalDailyWage || 0;
      const a = (s.bonus || s.totalOvertimePay || 0);
      const k = (s.deduction || 0);
      totalWage += w;
      totalAddition += a;
      totalKasbon += k;
      if (w > 0 || (s.daysPresent || 0) > 0) {
        daysPresentCount += (s.daysPresent || 1);
      }
    });

    const totalNet = Math.max(0, totalWage + totalAddition - totalKasbon);

    return {
      totalWage,
      totalAddition,
      totalKasbon,
      totalNet,
      count: employeeSlipsInRange.length,
      daysPresentCount
    };
  }, [employeeSlipsInRange]);

  const handlePrintRiwayatSlip = () => {
    if (!selectedEmpForRiwayat) return;
    const slipToPrint: SalarySlip = {
      id: `slip-riwayat-${Date.now()}`,
      slipNumber: generateInvoiceCode('SLIP'),
      periodStart: riwayatStartDate,
      periodEnd: riwayatEndDate,
      generatedDate: new Date().toISOString(),
      employeeId: selectedEmpForRiwayat.id,
      employeeName: selectedEmpForRiwayat.name,
      employeeRole: selectedEmpForRiwayat.role,
      daysPresent: aggregatedRiwayat.daysPresentCount || aggregatedRiwayat.count || 1,
      daysHalf: 0,
      daysOvertime: 0,
      totalOvertimeHours: 0,
      totalDailyWage: aggregatedRiwayat.totalWage,
      totalOvertimePay: aggregatedRiwayat.totalAddition,
      allowance: 0,
      bonus: aggregatedRiwayat.totalAddition,
      deduction: aggregatedRiwayat.totalKasbon,
      netSalary: aggregatedRiwayat.totalNet,
      paymentStatus: 'Sudah Dibayar',
      notes: `Slip Gaji Periode ${formatDate(riwayatStartDate)} s/d ${formatDate(riwayatEndDate)}`,
    };
    onPrintSalarySlip(slipToPrint);
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
            <span>1. Input Slip Gaji Harian</span>
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
            <span>2. Riwayat & Cetak Slip Periode</span>
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
            onClick={() => setActiveTab('karyawan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'karyawan'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Data Karyawan ({employees.length})</span>
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

          {/* Locked Date Banner (Sudah pernah di-save) */}
          {hasSavedSlipsForDate && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold block sm:inline">
                    Slip gaji tanggal {getDayNameID(slipDate)}, {formatDateDDNopYYYY(slipDate)} sudah pernah disimpan ({savedSlipsCountForDate} slip) dan terkunci.
                  </span>{' '}
                  <span className="text-amber-800">
                    Data tidak dapat disimpan ulang. Silakan lihat atau cetak melalui tab Riwayat & Cetak Slip Periode.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('riwayat_gaji')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer transition-colors"
              >
                Lihat Riwayat
              </button>
            </div>
          )}

          {/* Excluded Employees Restore Banner */}
          {!hasSavedSlipsForDate && excludedIdsForDate.length > 0 && (
            <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-700">
              <span>
                <strong className="text-slate-900">{excludedIdsForDate.length} karyawan</strong> dihapus dari daftar hari ini (tidak masuk).
              </span>
              <button
                type="button"
                onClick={handleRestoreAllForDate}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg font-bold text-[11px] cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tampilkan Kembali ({excludedIdsForDate.length})</span>
              </button>
            </div>
          )}

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
              <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                <span>
                  Karyawan Masuk Hari Ini: <strong className="text-slate-900">{filteredActiveEmployees.length} orang</strong>
                </span>
                {hasSavedSlipsForDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    <Lock className="w-3 h-3" />
                    Tersimpan
                  </span>
                )}
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
                    <th className="py-2.5 px-3 text-right text-rose-700">Kasbon</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActiveEmployees.map((emp) => {
                    const entry = slipEntries[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' };
                    const totalWage = Number(entry.wage) || 0;
                    const additionVal = Number(entry.addition) || 0;
                    const kasbonVal = Number(entry.kasbon) || 0;
                    const totalNet = Math.max(0, totalWage + additionVal - kasbonVal);
                    const isEmpSaved = Boolean(existingSlipsByEmpForDate[emp.id]);

                    return (
                      <tr key={emp.id} className={hasSavedSlipsForDate ? 'bg-slate-50/60' : 'hover:bg-slate-50/80'}>
                        {/* 1. Nama Karyawan */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{emp.name}</span>
                              {isEmpSaved && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  ✓ Tersimpan
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block">{emp.role} ({emp.code})</span>
                          </div>
                        </td>

                        {/* 2. Gaji */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={hasSavedSlipsForDate}
                            value={entry.wage === 0 ? '' : entry.wage.toLocaleString('id-ID')}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              if (hasSavedSlipsForDate) return;
                              const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = raw === '' ? 0 : parseFloat(raw) || 0;
                              setSlipEntries(prev => ({
                                ...prev,
                                [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), wage: val }
                              }));
                            }}
                            className={`w-32 text-right p-1.5 text-xs font-mono font-bold border rounded-lg focus:outline-hidden ${
                              hasSavedSlipsForDate
                                ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500'
                            }`}
                          />
                        </td>

                        {/* 3. Tambahan */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={hasSavedSlipsForDate}
                            value={entry.addition === 0 ? '' : entry.addition.toLocaleString('id-ID')}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              if (hasSavedSlipsForDate) return;
                              const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = raw === '' ? 0 : parseFloat(raw) || 0;
                              setSlipEntries(prev => ({
                                ...prev,
                                [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), addition: val }
                              }));
                            }}
                            className={`w-32 text-right p-1.5 text-xs font-mono font-bold border rounded-lg focus:outline-hidden ${
                              hasSavedSlipsForDate
                                ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-blue-700 focus:ring-2 focus:ring-amber-500'
                            }`}
                          />
                        </td>

                        {/* 4. Kasbon (Pemotong) */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={hasSavedSlipsForDate}
                            value={entry.kasbon === 0 ? '' : entry.kasbon.toLocaleString('id-ID')}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              if (hasSavedSlipsForDate) return;
                              const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = raw === '' ? 0 : parseFloat(raw) || 0;
                              setSlipEntries(prev => ({
                                ...prev,
                                [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), kasbon: val }
                              }));
                            }}
                            className={`w-32 text-right p-1.5 text-xs font-mono font-bold border rounded-lg focus:outline-hidden ${
                              hasSavedSlipsForDate
                                ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-rose-50/50 border-rose-300 text-rose-700 focus:ring-2 focus:ring-rose-500'
                            }`}
                          />
                        </td>

                        {/* 5. Total (Gaji + Tambahan - Kasbon) */}
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-700 text-sm">
                          {formatCurrency(totalNet)}
                        </td>

                        {/* 6. Aksi Hapus Karyawan Tidak Masuk */}
                        <td className="py-2.5 px-3 text-center">
                          {hasSavedSlipsForDate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold">
                              <Lock className="w-3 h-3" />
                              Terkunci
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleExcludeEmployeeForDate(emp.id)}
                              title="Hapus dari daftar hari ini (karyawan tidak masuk)"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredActiveEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {includedActiveEmployees.length === 0 && excludedIdsForDate.length > 0 ? (
                          <div className="space-y-2">
                            <p>Semua karyawan dihapus dari daftar tanggal ini.</p>
                            {!hasSavedSlipsForDate && (
                              <button
                                type="button"
                                onClick={handleRestoreAllForDate}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Tampilkan Kembali Semua Karyawan</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          'Tidak ada karyawan aktif yang cocok dengan pencarian.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="block sm:hidden divide-y divide-slate-100 p-2.5 space-y-3">
              {filteredActiveEmployees.map((emp) => {
                const entry = slipEntries[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' };
                const totalWage = Number(entry.wage) || 0;
                const additionVal = Number(entry.addition) || 0;
                const kasbonVal = Number(entry.kasbon) || 0;
                const totalNet = Math.max(0, totalWage + additionVal - kasbonVal);
                const isEmpSaved = Boolean(existingSlipsByEmpForDate[emp.id]);

                return (
                  <div key={emp.id} className={`p-3.5 rounded-xl border space-y-3 text-xs shadow-2xs ${hasSavedSlipsForDate ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{emp.name}</span>
                          {isEmpSaved && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              ✓ Tersimpan
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block">{emp.role} ({emp.code})</span>
                      </div>
                      {!hasSavedSlipsForDate ? (
                        <button
                          type="button"
                          onClick={() => handleExcludeEmployeeForDate(emp.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer shrink-0"
                          title="Hapus (tidak masuk)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/70 text-slate-600 text-[10px] font-bold shrink-0">
                          <Lock className="w-3 h-3" />
                          Terkunci
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Gaji:</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={hasSavedSlipsForDate}
                          value={entry.wage === 0 ? '' : entry.wage.toLocaleString('id-ID')}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            if (hasSavedSlipsForDate) return;
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            const val = raw === '' ? 0 : parseFloat(raw) || 0;
                            setSlipEntries(prev => ({
                              ...prev,
                              [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), wage: val }
                            }));
                          }}
                          className={`w-full text-right p-1.5 text-xs font-mono font-bold border rounded-lg ${
                            hasSavedSlipsForDate
                              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Tambahan:</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={hasSavedSlipsForDate}
                          value={entry.addition === 0 ? '' : entry.addition.toLocaleString('id-ID')}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            if (hasSavedSlipsForDate) return;
                            const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                            const val = raw === '' ? 0 : parseFloat(raw) || 0;
                            setSlipEntries(prev => ({
                              ...prev,
                              [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), addition: val }
                            }));
                          }}
                          className={`w-full text-right p-1.5 text-xs font-mono font-bold border rounded-lg ${
                            hasSavedSlipsForDate
                              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-50 border-slate-300 text-blue-700'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-rose-700 block mb-1">Kasbon (Pemotong):</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={hasSavedSlipsForDate}
                        value={entry.kasbon === 0 ? '' : entry.kasbon.toLocaleString('id-ID')}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          if (hasSavedSlipsForDate) return;
                          const raw = e.target.value.replace(/\./g, '').replace(',', '.');
                          const val = raw === '' ? 0 : parseFloat(raw) || 0;
                          setSlipEntries(prev => ({
                            ...prev,
                            [emp.id]: { ...(prev[emp.id] || { wage: 0, addition: 0, kasbon: 0, notes: '' }), kasbon: val }
                          }));
                        }}
                        className={`w-full text-right p-1.5 text-xs font-mono font-bold border rounded-lg ${
                          hasSavedSlipsForDate
                            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-rose-50/50 border-rose-300 text-rose-700 focus:ring-2 focus:ring-rose-500'
                        }`}
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
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">TOTAL GAJI POKOK:</span>
                <span className="text-sm font-bold font-mono text-slate-200 block">{formatCurrency(batchSummary.totalWage)}</span>
              </div>
              <div>
                <span className="text-[10px] text-blue-300 block uppercase font-medium">TOTAL TAMBAHAN:</span>
                <span className="text-sm font-bold font-mono text-blue-400 block">+{formatCurrency(batchSummary.totalAddition)}</span>
              </div>
              <div>
                <span className="text-[10px] text-rose-300 block uppercase font-medium">TOTAL KASBON:</span>
                <span className="text-sm font-bold font-mono text-rose-400 block">-{formatCurrency(batchSummary.totalKasbon)}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-300 block uppercase font-medium">TOTAL BERSIH DIBAYAR:</span>
                <span className="text-base sm:text-lg font-bold font-mono text-amber-400 block">{formatCurrency(batchSummary.totalNet)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={hasSavedSlipsForDate || includedActiveEmployees.length === 0}
              onClick={handleSaveAllSlips}
              className={`px-6 py-3 font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 ${
                hasSavedSlipsForDate || includedActiveEmployees.length === 0
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
              }`}
            >
              {hasSavedSlipsForDate ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sudah Disimpan (Terkunci)</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Simpan Semua Slip Gaji ({includedActiveEmployees.length} Karyawan)</span>
                </>
              )}
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

          {/* Direct Preview Slip Card (Simple Nota Style) */}
          {selectedEmpForRiwayat ? (
            <div className="space-y-4">
              <div className="max-w-[440px] mx-auto bg-white rounded-xl border border-slate-300 shadow-sm p-5 sm:p-6 font-mono text-xs text-slate-900 space-y-3">
                {/* Header Nota */}
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm sm:text-base tracking-tight">{storeName}</div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    SLIP GAJI KARYAWAN
                  </div>
                </div>

                <div className="border-b border-dashed border-slate-400 my-2"></div>

                {/* Meta Info */}
                <div className="text-left text-[11px] space-y-0.5">
                  <div className="flex justify-between gap-2">
                    <span>Periode :</span>
                    <span className="font-bold text-right">
                      {riwayatStartDate === riwayatEndDate
                        ? formatDate(riwayatStartDate)
                        : `${formatDate(riwayatStartDate)} s/d ${formatDate(riwayatEndDate)}`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Karyawan :</span>
                    <span className="font-bold text-right">{selectedEmpForRiwayat.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Bagian :</span>
                    <span className="text-right">{selectedEmpForRiwayat.role} ({selectedEmpForRiwayat.code})</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Hadir :</span>
                    <span className="font-bold text-right">{aggregatedRiwayat.daysPresentCount} Hari ({aggregatedRiwayat.count} Slip)</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-slate-400 my-2"></div>

                {/* Rincian Gaji Nota */}
                <div className="text-left space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>GAJI POKOK</span>
                    <span className="font-bold">{formatCurrency(aggregatedRiwayat.totalWage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TAMBAHAN</span>
                    <span className="font-bold text-blue-700">+{formatCurrency(aggregatedRiwayat.totalAddition)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>KASBON</span>
                    <span className="font-bold">-{formatCurrency(aggregatedRiwayat.totalKasbon)}</span>
                  </div>

                  <div className="flex justify-between font-extrabold text-xs pt-1.5 border-t border-slate-900 text-slate-900">
                    <span>TOTAL GAJI BERSIH</span>
                    <span>{formatCurrency(aggregatedRiwayat.totalNet)}</span>
                  </div>
                </div>

                <div className="my-2 text-center">
                  <span className="font-bold text-[11px] text-emerald-800 tracking-wider">
                    *** SUDAH DIBAYAR ***
                  </span>
                </div>

                <div className="border-b border-dashed border-slate-400 my-2"></div>

                <div className="text-center text-[11px] font-bold tracking-wide">
                  TERIMA KASIH
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePrintRiwayatSlip}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-sans font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    <span>Cetak / Bagikan Slip Nota</span>
                  </button>
                </div>
              </div>

              {/* Rincian Slip Harian dalam Periode */}
              <div className="max-w-2xl mx-auto border border-slate-200 rounded-xl overflow-hidden bg-white text-xs shadow-xs">
                <div className="bg-slate-100 text-slate-700 px-4 py-2.5 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 flex items-center justify-between">
                  <span>Rincian Slip Harian dalam Rentang Tanggal</span>
                  <span className="text-slate-500 text-[10px] font-mono">{employeeSlipsInRange.length} Data Slip</span>
                </div>
                {employeeSlipsInRange.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                          <th className="py-2 px-3">Tanggal Slip</th>
                          <th className="py-2 px-3 text-right">Gaji Pokok</th>
                          <th className="py-2 px-3 text-right">Tambahan</th>
                          <th className="py-2 px-3 text-right text-rose-700">Kasbon</th>
                          <th className="py-2 px-3 text-right">Total Bersih</th>
                          <th className="py-2 px-3 text-center w-16">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employeeSlipsInRange
                          .slice()
                          .sort((a, b) => (a.periodStart || a.generatedDate).localeCompare(b.periodStart || b.generatedDate))
                          .map((slip) => {
                            const dStr = slip.periodStart || slip.generatedDate.substring(0, 10);
                            return (
                              <tr key={slip.id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-medium text-slate-800">
                                  {getDayNameID(dStr)}, {formatDateDDNopYYYY(dStr)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-900">
                                  {formatCurrency(slip.totalDailyWage)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-blue-700">
                                  {slip.bonus || slip.totalOvertimePay ? `+${formatCurrency(slip.bonus || slip.totalOvertimePay)}` : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-rose-600 font-bold">
                                  {slip.deduction ? `-${formatCurrency(slip.deduction)}` : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                  {formatCurrency(slip.netSalary)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSlipToDelete(slip)}
                                    title="Hapus slip tanggal ini"
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Belum ada slip gaji harian yang tercatat untuk {selectedEmpForRiwayat.name} pada periode {formatDate(riwayatStartDate)} s/d {formatDate(riwayatEndDate)}.
                  </div>
                )}
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
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditEmployee(emp)}
                              className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold text-[11px]"
                              title="Edit profil karyawan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            {onDeleteEmployee && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Hapus data karyawan "${emp.name}" (${emp.code})? Tindakan ini akan menghapus data profil karyawan tersebut.`)) {
                                    onDeleteEmployee(emp.id);
                                  }
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold text-[11px]"
                                title="Hapus data karyawan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </div>
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

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                {editingEmployeeId && onDeleteEmployee ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Hapus data karyawan "${newEmpName}"? Tindakan ini akan menghapus profil karyawan dari sistem.`)) {
                        onDeleteEmployee(editingEmployeeId);
                        setIsEmployeeModalOpen(false);
                      }
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Karyawan</span>
                  </button>
                ) : <div />}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmployeeModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    Simpan Karyawan
                  </button>
                </div>
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
