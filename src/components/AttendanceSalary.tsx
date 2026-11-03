import React, { useState, useMemo, useEffect } from 'react';
import { 
  CalendarCheck, 
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
  Sparkles,
  X,
  MessageSquare,
  Search,
  Filter,
  Download,
  Share2,
  ExternalLink,
  Phone,
  RotateCcw,
  UserCheck,
  ShieldAlert,
  Edit3,
  WalletCards,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard
} from 'lucide-react';
import { 
  Employee, 
  AttendanceRecord, 
  SalarySlip, 
  AttendanceStatus, 
  EmployeeRole, 
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
  storeName = 'Berkah Unggas Sejahtera',
}) => {
  const [activeTab, setActiveTab] = useState<'absensi' | 'buat_slip' | 'riwayat_gaji' | 'kasbon' | 'karyawan'>('absensi');

  // Daily attendance state
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<string | null>(null);
  const [payrollSuccessNotification, setPayrollSuccessNotification] = useState<string | null>(null);

  const [dailyEntries, setDailyEntries] = useState<Record<string, {
    status: AttendanceStatus;
    wageAmount: number;
    overtimeHours: number;
    overtimePay: number;
    bonusAmount: number;
    notes: string;
  }>>({});

  // Sync daily entries when selectedDate changes
  React.useEffect(() => {
    const existing = attendanceRecords.filter(r => r.date === selectedDate);
    const mapped: Record<string, any> = {};

    employees.forEach(emp => {
      const rec = existing.find(r => r.employeeId === emp.id);
      if (rec) {
        mapped[emp.id] = {
          status: rec.status,
          wageAmount: rec.wageAmount,
          overtimeHours: rec.overtimeHours || 0,
          overtimePay: rec.overtimePay || 0,
          bonusAmount: rec.bonusAmount || 0,
          notes: rec.notes || '',
        };
      } else {
        mapped[emp.id] = {
          status: 'Hadir',
          wageAmount: emp.dailyWage,
          overtimeHours: 0,
          overtimePay: 0,
          bonusAmount: 0,
          notes: '',
        };
      }
    });

    setDailyEntries(mapped);
  }, [selectedDate, employees, attendanceRecords]);

  // Weekly payroll generation state
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().substring(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState<string>(getTodayDateString());
  const [selectedPayrollEmpId, setSelectedPayrollEmpId] = useState<string>(employees[0]?.id || '');
  const [allowanceInput, setAllowanceInput] = useState<number>(0); // e.g. Uang makan mingguan
  const [bonusInput, setBonusInput] = useState<number>(0);
  const [deductionInput, setDeductionInput] = useState<number>(0); // Potongan Kasbon
  const [deductionWarning, setDeductionWarning] = useState<string | null>(null);
  const [payrollNotes, setPayrollNotes] = useState<string>('');

  // Selected employee for weekly payroll
  const selectedPayrollEmp = useMemo(() => {
    return employees.find(e => e.id === selectedPayrollEmpId) || employees[0];
  }, [employees, selectedPayrollEmpId]);

  // Helper to calculate active outstanding kasbon balance for an employee
  const getEmployeeOutstandingKasbon = (empId: string): number => {
    const list = kasbonRecords.filter(k => k.employeeId === empId);
    const borrowed = list.filter(k => k.type === 'pinjam').reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
    const repaid = list.filter(k => k.type === 'bayar_slip' || k.type === 'bayar_manual').reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
    return Math.max(0, borrowed - repaid);
  };

  // Active kasbon for currently selected employee
  const selectedEmployeeOutstandingKasbon = useMemo(() => {
    if (!selectedPayrollEmp) return 0;
    return getEmployeeOutstandingKasbon(selectedPayrollEmp.id);
  }, [kasbonRecords, selectedPayrollEmp]);

  // Filter attendance records for this employee in selected weekly range
  const weeklyAttendance = useMemo(() => {
    if (!selectedPayrollEmp) return [];
    return attendanceRecords
      .filter(r => 
        r.employeeId === selectedPayrollEmp.id &&
        r.date >= periodStart &&
        r.date <= periodEnd
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [attendanceRecords, selectedPayrollEmp, periodStart, periodEnd]);

  // Weekly stats
  const daysPresent = useMemo(() => {
    return weeklyAttendance.filter(r => r.status === 'Hadir' || r.status === 'Lembur').length;
  }, [weeklyAttendance]);

  const daysHalf = useMemo(() => {
    return weeklyAttendance.filter(r => r.status === 'Setengah Hari').length;
  }, [weeklyAttendance]);

  const daysOvertime = useMemo(() => {
    return weeklyAttendance.filter(r => (r.overtimeHours || 0) > 0 || r.status === 'Lembur').length;
  }, [weeklyAttendance]);

  const totalOvertimeHours = useMemo(() => {
    return weeklyAttendance.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
  }, [weeklyAttendance]);

  const totalDailyWage = useMemo(() => {
    return weeklyAttendance.reduce((sum, r) => sum + (r.wageAmount || 0), 0);
  }, [weeklyAttendance]);

  const totalOvertimePay = useMemo(() => {
    return weeklyAttendance.reduce((sum, r) => sum + (r.overtimePay || 0), 0);
  }, [weeklyAttendance]);

  // Gross Salary (Total gaji kotor sebelum potongan kasbon)
  const grossSalary = useMemo(() => {
    return totalDailyWage + totalOvertimePay + (Number(allowanceInput) || 0) + (Number(bonusInput) || 0);
  }, [totalDailyWage, totalOvertimePay, allowanceInput, bonusInput]);

  // Net Weekly Salary (Take Home Pay)
  const netWeeklySalary = useMemo(() => {
    return Math.max(0, grossSalary - deductionInput);
  }, [grossSalary, deductionInput]);

  // When selected employee changes, automatically set deduction to employee's outstanding kasbon (capped at gross salary)
  useEffect(() => {
    if (selectedPayrollEmp) {
      const activeKasbon = getEmployeeOutstandingKasbon(selectedPayrollEmp.id);
      const initialDeduction = grossSalary > 0 ? Math.min(activeKasbon, grossSalary) : activeKasbon;
      setDeductionInput(initialDeduction);
      setDeductionWarning(null);
    }
  }, [selectedPayrollEmpId]);

  // Ensure deduction never exceeds gross salary
  useEffect(() => {
    if (deductionInput > grossSalary && grossSalary > 0) {
      setDeductionInput(grossSalary);
    }
  }, [grossSalary]);

  // Reset Overtime in the chosen period to 0 if there were past seed/test overtime records
  const handleResetPeriodOvertime = () => {
    if (!selectedPayrollEmp) return;
    const updated = attendanceRecords.map(r => {
      if (r.employeeId === selectedPayrollEmp.id && r.date >= periodStart && r.date <= periodEnd) {
        return {
          ...r,
          overtimeHours: 0,
          overtimePay: 0,
          status: r.status === 'Lembur' ? 'Hadir' as const : r.status
        };
      }
      return r;
    });
    onSaveAttendance(updated);
    setPayrollSuccessNotification(`Seluruh upah lembur ${selectedPayrollEmp.name} pada periode ini telah di-reset menjadi Rp 0.`);
    setTimeout(() => setPayrollSuccessNotification(null), 4000);
  };

  // History & Report Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyEmpFilter, setHistoryEmpFilter] = useState('ALL');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('ALL');

  // WhatsApp Sending Modal State
  const [waModalSlip, setWaModalSlip] = useState<SalarySlip | null>(null);
  const [waTargetPhone, setWaTargetPhone] = useState<string>('');

  // Open WhatsApp Modal
  const handleOpenWaModal = (slip: SalarySlip) => {
    const emp = employees.find(e => e.id === slip.employeeId);
    setWaModalSlip(slip);
    setWaTargetPhone(emp?.phone || '');
  };

  // Launch WhatsApp directly
  const handleLaunchWhatsApp = (slip: SalarySlip, phoneOverride?: string) => {
    const emp = employees.find(e => e.id === slip.employeeId);
    const rawPhone = phoneOverride || waTargetPhone || emp?.phone || '';
    const formattedPhone = formatPhoneNumberForWhatsApp(rawPhone);

    const messageEncoded = generateWhatsAppSalaryMessage(slip, storeName);
    const waUrl = formattedPhone 
      ? `https://wa.me/${formattedPhone}?text=${messageEncoded}`
      : `https://wa.me/?text=${messageEncoded}`;

    window.open(waUrl, '_blank');
    setWaModalSlip(null);
  };

  // Update a daily entry for an employee in Tab 1
  const handleUpdateDailyEntry = (empId: string, field: string, value: any) => {
    setDailyEntries(prev => {
      const current = prev[empId] || {
        status: 'Hadir',
        wageAmount: 0,
        overtimeHours: 0,
        overtimePay: 0,
        bonusAmount: 0,
        notes: '',
      };
      
      const updated = { ...current, [field]: value };
      
      // Auto calculate wage if status changed
      if (field === 'status') {
        const emp = employees.find(e => e.id === empId);
        const base = emp ? emp.dailyWage : 100000;
        if (value === 'Hadir' || value === 'Lembur') {
          updated.wageAmount = base;
        } else if (value === 'Setengah Hari') {
          updated.wageAmount = Math.round(base / 2);
        } else {
          updated.wageAmount = 0;
        }

        // If status changed to Hadir, and overtime was not set, ensure overtime is 0
        if (value === 'Hadir' && (!updated.overtimeHours || updated.overtimeHours === 0)) {
          updated.overtimeHours = 0;
          updated.overtimePay = 0;
        }
      }

      // Auto calculate overtime pay if hours changed
      if (field === 'overtimeHours') {
        const hours = parseFloat(value) || 0;
        const emp = employees.find(e => e.id === empId);
        const rate = emp ? emp.standardOvertimeRate : 20000;
        updated.overtimeHours = hours;
        updated.overtimePay = hours * rate;
      }

      return {
        ...prev,
        [empId]: updated,
      };
    });
  };

  // Filter employees visible on selectedDate for Attendance:
  // Active employees, or Non-Aktif employees whose deactivation date is >= selectedDate
  const visibleEmployeesForDate = useMemo(() => {
    return employees.filter(emp => {
      if (emp.status === 'Aktif') return true;
      if (emp.status === 'Non-Aktif') {
        if (!emp.deactivatedAt) return false;
        return selectedDate <= emp.deactivatedAt;
      }
      return true;
    });
  }, [employees, selectedDate]);

  // Save all attendance records for the selected date
  const handleSaveDailyAttendance = () => {
    let totalWageForDay = 0;
    let presentCount = 0;

    const recordsToSave: AttendanceRecord[] = visibleEmployeesForDate.map(emp => {
      const entry = dailyEntries[emp.id] || {
        status: 'Hadir',
        wageAmount: emp.dailyWage,
        overtimeHours: 0,
        overtimePay: 0,
        bonusAmount: 0,
        notes: '',
      };

      const finalWage = Number(entry.wageAmount) || 0;
      const finalOvertime = Number(entry.overtimePay) || 0;
      totalWageForDay += (finalWage + finalOvertime);
      if (entry.status === 'Hadir' || entry.status === 'Lembur' || entry.status === 'Setengah Hari') {
        presentCount++;
      }

      return {
        id: `att-${selectedDate}-${emp.id}`,
        date: selectedDate,
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        status: entry.status,
        wageAmount: finalWage,
        overtimeHours: Number(entry.overtimeHours) || 0,
        overtimePay: finalOvertime,
        bonusAmount: Number(entry.bonusAmount) || 0,
        notes: entry.notes || '',
      };
    });

    onSaveAttendance(recordsToSave);
    
    // Clear and set visual in-component confirmation
    setSaveSuccessNotification(
      `Absensi tanggal ${formatDate(selectedDate)} berhasil disimpan! (${presentCount} karyawan hadir, total upah tercatat: ${formatCurrency(totalWageForDay)})`
    );

    setTimeout(() => {
      setSaveSuccessNotification(null);
    }, 6000);
  };

  // Generate Weekly Slip
  const handleGenerateSlip = () => {
    if (!selectedPayrollEmp) return;

    if (deductionInput > grossSalary) {
      alert(`Potongan kasbon (${formatCurrency(deductionInput)}) tidak boleh melebihi total gaji yang didapat karyawan (${formatCurrency(grossSalary)}).`);
      return;
    }

    const outstandingBefore = selectedEmployeeOutstandingKasbon;
    const remainingAfter = Math.max(0, outstandingBefore - deductionInput);

    const newSlip: SalarySlip = {
      id: `slip-${Date.now()}`,
      slipNumber: generateInvoiceCode('SLIP'),
      periodStart,
      periodEnd,
      generatedDate: new Date().toISOString(),
      employeeId: selectedPayrollEmp.id,
      employeeName: selectedPayrollEmp.name,
      employeeRole: selectedPayrollEmp.role,
      daysPresent,
      daysHalf,
      daysOvertime,
      totalOvertimeHours,
      totalDailyWage,
      totalOvertimePay,
      allowance: Number(allowanceInput) || 0,
      bonus: Number(bonusInput) || 0,
      deduction: Number(deductionInput) || 0,
      netSalary: netWeeklySalary,
      paymentStatus: 'Sudah Dibayar',
      notes: payrollNotes,
      kasbonOutstandingBefore: outstandingBefore,
      kasbonRemainingAfter: remainingAfter,
    };

    onGenerateSalarySlip(newSlip);

    // If deduction was made, record payment in Kasbon ledger so sisa kasbon is automatically updated
    if (deductionInput > 0) {
      const kasbonPaymentRecord: EmployeeKasbonRecord = {
        id: `ksb-pay-${newSlip.id}`,
        date: new Date().toISOString().substring(0, 10),
        employeeId: selectedPayrollEmp.id,
        employeeName: selectedPayrollEmp.name,
        type: 'bayar_slip',
        amount: deductionInput,
        remainingBalanceAfter: remainingAfter,
        notes: `Potongan kasbon via Slip Gaji #${newSlip.slipNumber} (${formatDate(periodStart)} s/d ${formatDate(periodEnd)})`,
        salarySlipId: newSlip.id,
        createdAt: new Date().toISOString(),
      };
      onSaveKasbon(kasbonPaymentRecord);
    }

    onPrintSalarySlip(newSlip);

    setPayrollSuccessNotification(`Slip Gaji ${newSlip.slipNumber} untuk ${selectedPayrollEmp.name} berhasil diterbitkan!`);
    setTimeout(() => setPayrollSuccessNotification(null), 6000);
  };

  // Filtered salary slips for History & Report tab
  const filteredSalarySlips = useMemo(() => {
    return salarySlips.filter((slip) => {
      if (historyEmpFilter !== 'ALL' && slip.employeeId !== historyEmpFilter) {
        return false;
      }
      if (historyMonthFilter !== 'ALL') {
        const slipMonth = slip.periodStart.substring(0, 7);
        if (slipMonth !== historyMonthFilter) return false;
      }
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase();
        const matchName = slip.employeeName.toLowerCase().includes(query);
        const matchNumber = slip.slipNumber.toLowerCase().includes(query);
        const matchRole = slip.employeeRole.toLowerCase().includes(query);
        if (!matchName && !matchNumber && !matchRole) return false;
      }
      return true;
    });
  }, [salarySlips, historyEmpFilter, historyMonthFilter, historySearch]);

  // Aggregate stats for the report
  const reportStats = useMemo(() => {
    const totalTHP = filteredSalarySlips.reduce((sum, s) => sum + s.netSalary, 0);
    const totalDailyWage = filteredSalarySlips.reduce((sum, s) => sum + s.totalDailyWage, 0);
    const totalOvertime = filteredSalarySlips.reduce((sum, s) => sum + s.totalOvertimePay, 0);
    const totalAllowance = filteredSalarySlips.reduce((sum, s) => sum + s.allowance, 0);
    const totalBonus = filteredSalarySlips.reduce((sum, s) => sum + s.bonus, 0);
    const totalDeduction = filteredSalarySlips.reduce((sum, s) => sum + s.deduction, 0);
    const totalDaysWorked = filteredSalarySlips.reduce((sum, s) => sum + s.daysPresent, 0);

    return {
      totalTHP,
      totalDailyWage,
      totalOvertime,
      totalAllowance,
      totalBonus,
      totalDeduction,
      totalDaysWorked,
      count: filteredSalarySlips.length
    };
  }, [filteredSalarySlips]);

  // Months available in history for dropdown
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    salarySlips.forEach(s => {
      if (s.periodStart) set.add(s.periodStart.substring(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [salarySlips]);

  // Custom Roles state for employee registration
  const [customRoles, setCustomRoles] = useState<string[]>(() => {
    const existing = employees.map(e => e.role).filter(Boolean);
    return Array.from(new Set(existing));
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleAddCustomRole = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newRoleInput.trim();
    if (!trimmed) {
      setRoleError('Nama bagian / peran tidak boleh kosong.');
      return;
    }
    if (!customRoles.includes(trimmed)) {
      setCustomRoles(prev => [...prev, trimmed]);
    }
    setNewEmpRole(trimmed);
    setNewRoleInput('');
    setRoleError(null);
    setShowRoleModal(false);
  };

  // Realtime summary of attendance numbers for the day
  const dailySummaryTotals = useMemo(() => {
    let totalWage = 0;
    let totalOvertimeHours = 0;
    let totalOvertimePay = 0;
    let presentCount = 0;

    visibleEmployeesForDate.forEach(emp => {
      const entry = dailyEntries[emp.id];
      if (entry) {
        totalWage += Number(entry.wageAmount) || 0;
        totalOvertimeHours += Number(entry.overtimeHours) || 0;
        totalOvertimePay += Number(entry.overtimePay) || 0;
        if (entry.status === 'Hadir' || entry.status === 'Lembur' || entry.status === 'Setengah Hari') {
          presentCount++;
        }
      }
    });

    return {
      totalWage,
      totalOvertimeHours,
      totalOvertimePay,
      grandTotal: totalWage + totalOvertimePay,
      presentCount,
    };
  }, [visibleEmployeesForDate, dailyEntries]);

  // Employee Form State (Add & Edit)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [newEmpCode, setNewEmpCode] = useState(`EMP-${employees.length + 1}`);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<string>(''); // Dikosongkan sesuai permintaan
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpDailyWage, setNewEmpDailyWage] = useState<number>(100000);
  const [newEmpOvertimeRate, setNewEmpOvertimeRate] = useState<number>(20000);
  const [newEmpStatus, setNewEmpStatus] = useState<'Aktif' | 'Non-Aktif'>('Aktif');
  const [newEmpDeactivatedAt, setNewEmpDeactivatedAt] = useState<string>(getTodayDateString());
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

  const handleOpenAddEmployee = () => {
    setEditingEmployeeId(null);
    setNewEmpCode(`EMP-${employees.length + 1}`);
    setNewEmpName('');
    setNewEmpRole(''); // Dikosongkan pada saat tambah karyawan baru
    setNewEmpPhone('');
    setNewEmpDailyWage(100000);
    setNewEmpOvertimeRate(20000);
    setNewEmpStatus('Aktif');
    setNewEmpDeactivatedAt(getTodayDateString());
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setNewEmpCode(emp.code);
    setNewEmpName(emp.name);
    setNewEmpRole(emp.role);
    setNewEmpPhone(emp.phone || '');
    setNewEmpDailyWage(emp.dailyWage);
    setNewEmpOvertimeRate(emp.standardOvertimeRate);
    setNewEmpStatus(emp.status || 'Aktif');
    setNewEmpDeactivatedAt(emp.deactivatedAt || getTodayDateString());
    setIsEmployeeModalOpen(true);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    if (!newEmpRole.trim()) {
      alert('Silakan pilih atau daftarkan Bagian / Peran untuk karyawan terlebih dahulu.');
      return;
    }

    const savedEmp: Employee = {
      id: editingEmployeeId || `emp-${Date.now()}`,
      code: newEmpCode,
      name: newEmpName.trim(),
      role: newEmpRole,
      phone: newEmpPhone.trim(),
      dailyWage: newEmpDailyWage,
      standardOvertimeRate: newEmpOvertimeRate,
      status: newEmpStatus,
      deactivatedAt: newEmpStatus === 'Non-Aktif' ? (newEmpDeactivatedAt || getTodayDateString()) : undefined,
    };

    onSaveEmployee(savedEmp);
    setEditingEmployeeId(null);
    setNewEmpName('');
    setNewEmpPhone('');
    setIsEmployeeModalOpen(false);
  };

  // Kasbon tab states & handlers
  const [kasbonFilterEmpId, setKasbonFilterEmpId] = useState<string>('ALL');
  const [kasbonSearchQuery, setKasbonSearchQuery] = useState<string>('');
  const [isAddKasbonModalOpen, setIsAddKasbonModalOpen] = useState(false);
  const [addKasbonEmpId, setAddKasbonEmpId] = useState<string>('');
  const [addKasbonDate, setAddKasbonDate] = useState<string>(getTodayDateString());
  const [addKasbonAmount, setAddKasbonAmount] = useState<number>(100000);
  const [addKasbonNotes, setAddKasbonNotes] = useState<string>('');

  const [isManualRepayModalOpen, setIsManualRepayModalOpen] = useState(false);
  const [manualRepayEmpId, setManualRepayEmpId] = useState<string>('');
  const [manualRepayDate, setManualRepayDate] = useState<string>(getTodayDateString());
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

  // Filtered kasbon records for ledger table
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

  // Handle open & submit new Kasbon loan
  const handleOpenAddKasbon = (empId?: string) => {
    setAddKasbonEmpId(empId || employees[0]?.id || '');
    setAddKasbonDate(getTodayDateString());
    setAddKasbonAmount(100000);
    setAddKasbonNotes('');
    setIsAddKasbonModalOpen(true);
  };

  const handleSubmitAddKasbon = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === addKasbonEmpId);
    if (!emp) {
      alert('Silakan pilih karyawan terlebih dahulu.');
      return;
    }
    if (addKasbonAmount <= 0) {
      alert('Nominal kasbon harus lebih dari Rp 0.');
      return;
    }

    const currentBalance = getEmployeeOutstandingKasbon(emp.id);
    const newBalance = currentBalance + addKasbonAmount;

    const newRecord: EmployeeKasbonRecord = {
      id: `ksb-borrow-${Date.now()}`,
      date: addKasbonDate,
      employeeId: emp.id,
      employeeName: emp.name,
      type: 'pinjam',
      amount: addKasbonAmount,
      remainingBalanceAfter: newBalance,
      notes: addKasbonNotes.trim() || 'Pinjaman kasbon karyawan',
      createdAt: new Date().toISOString(),
    };

    onSaveKasbon(newRecord);
    setIsAddKasbonModalOpen(false);
  };

  // Handle open & submit manual repayment
  const handleOpenManualRepay = (empId?: string) => {
    const targetEmpId = empId || employees.find(e => getEmployeeOutstandingKasbon(e.id) > 0)?.id || employees[0]?.id || '';
    setManualRepayEmpId(targetEmpId);
    setManualRepayDate(getTodayDateString());
    const balance = getEmployeeOutstandingKasbon(targetEmpId);
    setManualRepayAmount(balance > 0 ? balance : 50000);
    setManualRepayNotes('Pelunasan kasbon tunai langsung');
    setIsManualRepayModalOpen(true);
  };

  const handleSubmitManualRepay = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === manualRepayEmpId);
    if (!emp) {
      alert('Silakan pilih karyawan terlebih dahulu.');
      return;
    }
    const currentBalance = getEmployeeOutstandingKasbon(emp.id);
    if (currentBalance <= 0) {
      alert('Karyawan ini tidak memiliki saldo kasbon yang perlu dibayar.');
      return;
    }
    if (manualRepayAmount <= 0) {
      alert('Nominal pembayaran kasbon harus lebih dari Rp 0.');
      return;
    }
    if (manualRepayAmount > currentBalance) {
      alert(`Nominal pembayaran (${formatCurrency(manualRepayAmount)}) tidak boleh melebihi sisa kasbon karyawan (${formatCurrency(currentBalance)}).`);
      return;
    }

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
      {/* Tab bar - Glass Translucent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/60 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('absensi')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'absensi'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white/60 hover:bg-white/80'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>1. Absensi & Upah Harian</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('buat_slip')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'buat_slip'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white/60 hover:bg-white/80'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>2. Buat Slip Gaji</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat_gaji')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'riwayat_gaji'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white/60 hover:bg-white/80'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>3. Laporan & Riwayat Gaji</span>
            {salarySlips.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'riwayat_gaji' ? 'bg-amber-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {salarySlips.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kasbon')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'kasbon'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white/60 hover:bg-white/80'
            }`}
          >
            <WalletCards className="w-4 h-4 text-amber-600" />
            <span>4. Kasbon Karyawan</span>
            {kasbonOverview.empCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'kasbon' ? 'bg-amber-700 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {kasbonOverview.empCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('karyawan')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'karyawan'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-white/60 hover:bg-white/80'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>5. Data Karyawan ({employees.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-700 bg-white/70 px-2.5 py-1 rounded-lg border border-white/60 hidden sm:block">
          Modul: <span className="font-semibold text-slate-900">Kehadiran, Gaji & WhatsApp</span>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION BANNER */}
      {saveSuccessNotification && (
        <div className="p-3.5 bg-emerald-600/95 backdrop-blur-md text-white rounded-xl shadow-md flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            <span>{saveSuccessNotification}</span>
          </div>
          <button
            onClick={() => setSaveSuccessNotification(null)}
            className="p-1 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer text-emerald-100 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: DAILY ATTENDANCE (ABSENSI HARIAN & UPAH HARIAN) */}
      {activeTab === 'absensi' && (
        <div className="space-y-4">
          <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block">Pilih Tanggal Absensi:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-0.5 p-2 text-xs bg-white/80 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveDailyAttendance}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Absensi & Upah Hari Ini</span>
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 overflow-hidden shadow-md">
            <div className="p-3.5 border-b border-slate-200/60 bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Daftar Absensi & Upah Harian ({formatDate(selectedDate)})
                </h3>
                <p className="text-[11px] text-slate-600">
                  Pilih status kehadiran dan jam lembur (jika ada). Jika hadir normal, biarkan lembur 0 jam.
                </p>
              </div>
              <div className="text-xs text-slate-700 font-medium">
                Total Karyawan Aktif: <span className="font-bold text-slate-900">{visibleEmployeesForDate.length} Orang</span>
              </div>
            </div>

            {/* MOBILE ATTENDANCE CARDS */}
            <div className="block sm:hidden divide-y divide-slate-100 p-2.5 space-y-3">
              {visibleEmployeesForDate.map((emp) => {
                const entry = dailyEntries[emp.id] || {
                  status: 'Hadir',
                  wageAmount: emp.dailyWage,
                  overtimeHours: 0,
                  overtimePay: 0,
                  notes: '',
                };

                return (
                  <div key={emp.id} className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-white/80 shadow-2xs space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 block text-sm">{emp.name}</span>
                          {getEmployeeOutstandingKasbon(emp.id) > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setKasbonFilterEmpId(emp.id);
                                setActiveTab('kasbon');
                              }}
                              className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-full font-mono font-bold cursor-pointer hover:bg-rose-100 transition-colors"
                              title="Lihat detail kasbon karyawan ini"
                            >
                              Kasbon: {formatCurrency(getEmployeeOutstandingKasbon(emp.id))}
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">{emp.role} ({emp.code})</span>
                      </div>
                      <select
                        value={entry.status}
                        onChange={(e) => handleUpdateDailyEntry(emp.id, 'status', e.target.value)}
                        className="p-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-900"
                      >
                        <option value="Hadir">Hadir Penuh</option>
                        <option value="Setengah Hari">Setengah Hari</option>
                        <option value="Lembur">Lembur</option>
                        <option value="Izin">Izin</option>
                        <option value="Sakit">Sakit</option>
                        <option value="Alpa">Alpa</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Upah Harian (Rp):</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 font-bold text-slate-400 text-xs">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={entry.wageAmount === 0 ? '' : Number(entry.wageAmount).toLocaleString('id-ID')}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              handleUpdateDailyEntry(emp.id, 'wageAmount', raw === '' ? 0 : parseInt(raw, 10));
                            }}
                            className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-md font-mono font-bold text-slate-900 text-xs"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Lembur (Jam):</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={entry.overtimeHours === 0 ? '' : entry.overtimeHours}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                            handleUpdateDailyEntry(emp.id, 'overtimeHours', val);
                          }}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-md font-mono text-center text-xs font-bold text-slate-900"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {entry.overtimePay > 0 && (
                      <div className="flex justify-between text-[11px] text-blue-700 font-semibold bg-blue-50/80 p-1.5 rounded">
                        <span>Upah Lembur ({entry.overtimeHours} jam):</span>
                        <span className="font-mono">+{formatCurrency(entry.overtimePay)}</span>
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Catatan harian..."
                      value={entry.notes}
                      onChange={(e) => handleUpdateDailyEntry(emp.id, 'notes', e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-[11px]"
                    />
                  </div>
                );
              })}

              {visibleEmployeesForDate.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs bg-white/50 rounded-xl">
                  Belum ada karyawan aktif terdaftar untuk tanggal ini.
                </div>
              )}

              {/* RINGKASAN REKAP TOTAL UPAH HARI INI (MOBILE) */}
              <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200 space-y-1.5 text-xs font-mono shadow-2xs">
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>Kehadiran:</span>
                  <span>{dailySummaryTotals.presentCount} dari {visibleEmployeesForDate.length} Karyawan</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Total Upah Pokok:</span>
                  <span className="font-bold">{formatCurrency(dailySummaryTotals.totalWage)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Total Lembur ({dailySummaryTotals.totalOvertimeHours} jam):</span>
                  <span className="font-bold">+{formatCurrency(dailySummaryTotals.totalOvertimePay)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800 pt-1.5 border-t border-amber-200 text-sm">
                  <span>Total Upah Hari Ini:</span>
                  <span>{formatCurrency(dailySummaryTotals.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-white/40 text-slate-700">
                    <th className="py-2.5 px-3">Nama Karyawan</th>
                    <th className="py-2.5 px-3">Bagian / Peran</th>
                    <th className="py-2.5 px-3">Status Absen</th>
                    <th className="py-2.5 px-3 w-36">Upah Harian (Rp)</th>
                    <th className="py-2.5 px-3 w-28 text-center">Lembur (Jam)</th>
                    <th className="py-2.5 px-3 text-right">Upah Lembur</th>
                    <th className="py-2.5 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleEmployeesForDate.map((emp) => {
                    const entry = dailyEntries[emp.id] || {
                      status: 'Hadir',
                      wageAmount: emp.dailyWage,
                      overtimeHours: 0,
                      overtimePay: 0,
                      notes: '',
                    };

                    return (
                      <tr key={emp.id} className="hover:bg-white/60">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 block">{emp.name}</span>
                            {getEmployeeOutstandingKasbon(emp.id) > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setKasbonFilterEmpId(emp.id);
                                  setActiveTab('kasbon');
                                }}
                                className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-full font-mono font-bold cursor-pointer hover:bg-rose-100 transition-colors"
                                title="Lihat detail kasbon karyawan ini"
                              >
                                Kasbon: {formatCurrency(getEmployeeOutstandingKasbon(emp.id))}
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{emp.code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{emp.role}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={entry.status}
                            onChange={(e) => handleUpdateDailyEntry(emp.id, 'status', e.target.value)}
                            className="p-1.5 bg-white/90 border border-slate-200 rounded-md text-xs font-semibold text-slate-900"
                          >
                            <option value="Hadir">Hadir Penuh</option>
                            <option value="Setengah Hari">Setengah Hari</option>
                            <option value="Lembur">Lembur</option>
                            <option value="Izin">Izin</option>
                            <option value="Sakit">Sakit</option>
                            <option value="Alpa">Alpa / Tanpa Keterangan</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={entry.wageAmount === 0 ? '' : Number(entry.wageAmount).toLocaleString('id-ID')}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                handleUpdateDailyEntry(emp.id, 'wageAmount', raw === '' ? 0 : parseInt(raw, 10));
                              }}
                              className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-md font-mono font-bold text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={entry.overtimeHours === 0 ? '' : entry.overtimeHours}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                              handleUpdateDailyEntry(emp.id, 'overtimeHours', val);
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-md font-mono text-slate-900 text-center font-bold"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-700 font-bold">
                          {entry.overtimePay > 0 ? `+${formatCurrency(entry.overtimePay)}` : 'Rp 0'}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Catatan..."
                            value={entry.notes}
                            onChange={(e) => handleUpdateDailyEntry(emp.id, 'notes', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-[11px]"
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {visibleEmployeesForDate.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                        Belum ada karyawan aktif terdaftar untuk tanggal ini.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-mono text-xs">
                  <tr className="font-bold text-slate-800">
                    <td colSpan={3} className="py-2.5 px-3 text-slate-700 font-semibold">
                      Total Hari Ini ({dailySummaryTotals.presentCount} Karyawan Hadir):
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {formatCurrency(dailySummaryTotals.totalWage)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 font-bold">
                      {dailySummaryTotals.totalOvertimeHours} Jam
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-700 font-bold">
                      +{formatCurrency(dailySummaryTotals.totalOvertimePay)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800 text-sm">
                      {formatCurrency(dailySummaryTotals.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="p-4 bg-white/40 border-t border-slate-200/80 flex justify-end">
              <button
                type="button"
                onClick={handleSaveDailyAttendance}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Absensi & Upah Hari Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUAT SLIP GAJI DENGAN RINCIAN TABEL LENGKAP */}
      {activeTab === 'buat_slip' && (
        <div className="space-y-4">
          {payrollSuccessNotification && (
            <div className="p-3.5 bg-emerald-600/95 backdrop-blur-md text-white rounded-xl shadow-xs flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                <span className="font-medium">{payrollSuccessNotification}</span>
              </div>
              <button onClick={() => setPayrollSuccessNotification(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="max-w-4xl mx-auto bg-white/75 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-lg space-y-5">
            <div className="border-b border-slate-200/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Formulir Penerbitan Slip Gaji Mingguan</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pilih karyawan dan tentukan rentang tanggal. Sistem akan menampilkan rincian kehadiran dan hitungan harian secara transparan.
                </p>
              </div>
            </div>

            {/* 1. SELECT EMPLOYEE (CLEAN DROPDOWN - NO CROWDED RATES IN OPTIONS) */}
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">
                Pilih Nama Karyawan:
              </label>
              <select
                value={selectedPayrollEmpId}
                onChange={(e) => setSelectedPayrollEmpId(e.target.value)}
                className="w-full p-2.5 bg-white/90 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.role}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. EMPLOYEE PROFILE & RATE DETAIL CARD (TABLE FORMAT AS REQUESTED) */}
            {selectedPayrollEmp && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3.5 border border-white/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold text-sm">
                      {selectedPayrollEmp.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm block leading-tight">{selectedPayrollEmp.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Kode ID: {selectedPayrollEmp.code}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Status: {selectedPayrollEmp.status}
                  </span>
                </div>

                {/* Detail Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Posisi / Bagian:</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedPayrollEmp.role}</span>
                  </div>

                  <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">No. WhatsApp Karyawan:</span>
                    <span className="font-mono font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {selectedPayrollEmp.phone || 'Belum diisi'}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Tarif Upah Harian:</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                      {formatCurrency(selectedPayrollEmp.dailyWage)} <span className="text-[10px] text-slate-500 font-normal">/hari</span>
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Standar Tarif Lembur:</span>
                    <span className="font-mono font-bold text-blue-700 mt-0.5 block">
                      {formatCurrency(selectedPayrollEmp.standardOvertimeRate)} <span className="text-[10px] text-slate-500 font-normal">/jam</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DATE RANGE SELECTOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dari Tanggal (Awal Periode):</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full p-2.5 bg-white/90 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sampai Tanggal (Akhir Periode):</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full p-2.5 bg-white/90 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>
            </div>

            {/* 4. DETAIL TABEL HITUNGAN HARIAN & ABSENSI PER TANGGAL (TRANSPARENCY FOR OVERTIME) */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/80 shadow-2xs overflow-hidden">
              <div className="p-3 bg-slate-50/90 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Rincian Absensi & Hitungan Harian ({formatDate(periodStart)} s/d {formatDate(periodEnd)})</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Daftar tanggal kehadiran yang dihitung ke dalam slip gaji ini
                  </span>
                </div>

                {totalOvertimePay > 0 && (
                  <button
                    type="button"
                    onClick={handleResetPeriodOvertime}
                    className="self-start sm:self-auto flex items-center gap-1 text-[11px] px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold transition-colors cursor-pointer"
                    title="Klik jika Anda tidak menginginkan upah lembur pada periode ini"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Lembur Jadi Rp 0</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-100/60 text-slate-600 text-[11px]">
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Upah Pokok</th>
                      <th className="py-2 px-3 text-center">Jam Lembur</th>
                      <th className="py-2 px-3 text-right">Upah Lembur</th>
                      <th className="py-2 px-3 text-right">Subtotal Hari Ini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weeklyAttendance.map((rec) => {
                      const dayTotal = (rec.wageAmount || 0) + (rec.overtimePay || 0);

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-medium text-slate-900">{formatDate(rec.date)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                              rec.status === 'Lembur' ? 'bg-blue-100 text-blue-800' :
                              rec.status === 'Setengah Hari' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-800">{formatCurrency(rec.wageAmount)}</td>
                          <td className="py-2 px-3 text-center font-mono font-medium">
                            {rec.overtimeHours ? `${rec.overtimeHours} Jam` : <span className="text-slate-400">0 Jam</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-blue-700">
                            {(rec.overtimePay && rec.overtimePay > 0) ? `+${formatCurrency(rec.overtimePay)}` : <span className="text-slate-400">Rp 0</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(dayTotal)}</td>
                        </tr>
                      );
                    })}

                    {weeklyAttendance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 text-xs italic">
                          Belum ada catatan absensi harian yang tersimpan pada rentang tanggal {formatDate(periodStart)} s/d {formatDate(periodEnd)}. Silakan input di tab '1. Absensi Harian'.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {weeklyAttendance.length > 0 && (
                    <tfoot>
                      <tr className="bg-amber-50/70 font-bold border-t border-slate-200/80 text-xs">
                        <td colSpan={2} className="py-2.5 px-3 text-slate-800">Total Akumulasi Periode:</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(totalDailyWage)}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-800">
                          {totalOvertimeHours > 0 ? `${totalOvertimeHours} Jam (${daysOvertime} Hari)` : '0 Jam'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-700">+{formatCurrency(totalOvertimePay)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">{formatCurrency(totalDailyWage + totalOvertimePay)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 5. TUNJANGAN, BONUS, DAN POTONGAN KASBON */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Uang Makan / Tunjangan (Rp):</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={allowanceInput === 0 ? '' : allowanceInput.toLocaleString('id-ID')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setAllowanceInput(raw === '' ? 0 : parseInt(raw, 10));
                    }}
                    placeholder="0"
                    className="w-full pl-8 p-2 bg-white/90 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bonus Khusus Tambahan (Rp):</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bonusInput === 0 ? '' : bonusInput.toLocaleString('id-ID')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setBonusInput(raw === '' ? 0 : parseInt(raw, 10));
                    }}
                    placeholder="0"
                    className="w-full pl-8 p-2 bg-white/90 border border-slate-300 rounded-lg font-mono text-emerald-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 block">Potongan Kasbon / Pinjaman (Rp):</label>
                  {selectedEmployeeOutstandingKasbon > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                      Kasbon Aktif: {formatCurrency(selectedEmployeeOutstandingKasbon)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={deductionInput === 0 ? '' : deductionInput.toLocaleString('id-ID')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const val = raw === '' ? 0 : parseInt(raw, 10);
                      if (val > grossSalary) {
                        setDeductionInput(grossSalary);
                        setDeductionWarning(`Potongan kasbon tidak boleh melebihi total gaji yang didapat (${formatCurrency(grossSalary)}). Nilai disesuaikan otomatis.`);
                      } else {
                        setDeductionInput(val);
                        setDeductionWarning(null);
                      }
                    }}
                    placeholder="0"
                    className="w-full pl-8 p-2 bg-white/90 border border-slate-300 rounded-lg font-mono text-rose-700 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                {deductionWarning && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1 bg-rose-50 p-1.5 rounded border border-rose-200">
                    ⚠️ {deductionWarning}
                  </p>
                )}

                {/* SISA KASBON LIVE PREVIEW */}
                <div className="mt-2 p-2.5 rounded-xl border bg-slate-50/90 border-slate-200/90 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Kasbon Dimiliki:</span>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(selectedEmployeeOutstandingKasbon)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Dipotong di Slip Ini:</span>
                    <span className="font-mono font-bold">-{formatCurrency(deductionInput)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold items-center">
                    <span className="text-slate-800">Sisa Kasbon Setelah Gaji:</span>
                    <span className={`font-mono text-xs ${
                      (selectedEmployeeOutstandingKasbon - deductionInput) > 0 
                        ? 'text-amber-700 font-bold' 
                        : selectedEmployeeOutstandingKasbon > 0 && deductionInput >= selectedEmployeeOutstandingKasbon
                          ? 'text-emerald-700 font-bold'
                          : 'text-slate-500'
                    }`}>
                      {formatCurrency(Math.max(0, selectedEmployeeOutstandingKasbon - deductionInput))}
                      {selectedEmployeeOutstandingKasbon > 0 && deductionInput >= selectedEmployeeOutstandingKasbon && ' (Lunas)'}
                    </span>
                  </div>

                  {selectedEmployeeOutstandingKasbon > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDeductionInput(Math.min(selectedEmployeeOutstandingKasbon, grossSalary));
                          setDeductionWarning(null);
                        }}
                        className="px-2 py-0.5 text-[10px] bg-white border border-amber-300 rounded text-amber-900 font-semibold hover:bg-amber-100 cursor-pointer shadow-2xs"
                        title="Potong lunas hingga batas gaji yang didapat"
                      >
                        Potong Penuh ({formatCurrency(Math.min(selectedEmployeeOutstandingKasbon, grossSalary))})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const half = Math.round(selectedEmployeeOutstandingKasbon / 2);
                          setDeductionInput(Math.min(half, grossSalary));
                          setDeductionWarning(null);
                        }}
                        className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer shadow-2xs"
                        title="Potong 50% kasbon"
                      >
                        Potong 50%
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeductionInput(0);
                          setDeductionWarning(null);
                        }}
                        className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-500 font-semibold hover:bg-slate-100 cursor-pointer shadow-2xs"
                      >
                        Tunda / Rp 0
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 text-xs block mb-1">Catatan Slip Gaji:</label>
              <input
                type="text"
                placeholder="Misal: Gaji Mingguan Jagal Potong Periode 20-26 Okt 2026"
                value={payrollNotes}
                onChange={(e) => setPayrollNotes(e.target.value)}
                className="w-full p-2 text-xs bg-white/90 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            {/* 6. TAKE HOME PAY FINAL & SUBMIT BUTTON */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Gaji Bersih Diterima (Take Home Pay):</span>
                <span className="text-2xl font-bold font-mono text-amber-400">{formatCurrency(netWeeklySalary)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({daysPresent} hari kerja {totalOvertimePay > 0 ? `+ lembur ${formatCurrency(totalOvertimePay)}` : '+ tanpa lembur'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateSlip}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Terbitkan Slip Gaji & Cetak</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEDICATED LAPORAN & RIWAYAT GAJI KARYAWAN (REPRINT & WA PDF) */}
      {activeTab === 'riwayat_gaji' && (
        <div className="space-y-4">
          
          {/* SUMMARY REPORT CARDS - TRANSLUCENT GLASS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Gaji Bersih Terbayar:</span>
              <span className="font-mono font-bold text-emerald-700 text-base sm:text-lg block">
                {formatCurrency(reportStats.totalTHP)}
              </span>
              <span className="text-[10px] text-slate-500 block">Dari {reportStats.count} slip terbit</span>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Upah Harian:</span>
              <span className="font-mono font-bold text-slate-800 text-base sm:text-lg block">
                {formatCurrency(reportStats.totalDailyWage)}
              </span>
              <span className="text-[10px] text-slate-500 block">{reportStats.totalDaysWorked} total hari kerja</span>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Upah Lembur:</span>
              <span className="font-mono font-bold text-blue-700 text-base sm:text-lg block">
                +{formatCurrency(reportStats.totalOvertime)}
              </span>
              <span className="text-[10px] text-slate-500 block">Kompensasi lembur armada & potong</span>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Potongan Kasbon:</span>
              <span className="font-mono font-bold text-rose-700 text-base sm:text-lg block">
                -{formatCurrency(reportStats.totalDeduction)}
              </span>
              <span className="text-[10px] text-slate-500 block">Dipangkas dari slip</span>
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari no. slip / nama karyawan..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white/90 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <select
                value={historyEmpFilter}
                onChange={(e) => setHistoryEmpFilter(e.target.value)}
                className="p-1.5 bg-white/90 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="ALL">Semua Karyawan ({employees.length})</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                ))}
              </select>

              {availableMonths.length > 0 && (
                <select
                  value={historyMonthFilter}
                  onChange={(e) => setHistoryMonthFilter(e.target.value)}
                  className="p-1.5 bg-white/90 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="ALL">Semua Bulan</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-slate-600 text-[11px] font-medium self-end sm:self-center">
              Ditemukan: <strong className="text-slate-900 font-bold">{filteredSalarySlips.length}</strong> slip gaji
            </div>
          </div>

          {/* TABLE & CARDS OF SALARY SLIPS */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-md overflow-hidden">
            <div className="p-3.5 border-b border-slate-200/80 bg-white/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Riwayat & Bukti Pembayaran Gaji Karyawan
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cetak ulang bukti slip gaji (A4/Thermal) atau kirim langsung ke nomor WhatsApp karyawan
                </p>
              </div>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="block sm:hidden divide-y divide-slate-100 p-2.5 space-y-2.5">
              {filteredSalarySlips.map((slip) => {
                const emp = employees.find(e => e.id === slip.employeeId);

                return (
                  <div key={slip.id} className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-white/80 space-y-2 text-xs shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{slip.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{slip.slipNumber} • {slip.employeeRole}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                        {slip.paymentStatus}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/70 space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-600">
                        <span>Periode Kerja:</span>
                        <span className="font-medium text-slate-800">{formatDate(slip.periodStart)} - {formatDate(slip.periodEnd)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Kehadiran:</span>
                        <span className="font-bold text-slate-800">{slip.daysPresent} Hari Hadir</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Upah Pokok:</span>
                        <span className="font-mono">{formatCurrency(slip.totalDailyWage)}</span>
                      </div>
                      {slip.totalOvertimePay > 0 && (
                        <div className="flex justify-between text-blue-700 font-semibold">
                          <span>Upah Lembur ({slip.totalOvertimeHours ? `${slip.totalOvertimeHours} Jam` : `${slip.daysOvertime} Hari`}):</span>
                          <span className="font-mono">+{formatCurrency(slip.totalOvertimePay)}</span>
                        </div>
                      )}
                      {slip.deduction > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Potongan Kasbon:</span>
                          <span className="font-mono">-{formatCurrency(slip.deduction)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Gaji Bersih (THP):</span>
                        <span className="font-mono font-bold text-emerald-700 text-base">{formatCurrency(slip.netSalary)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Share / WA Button */}
                        <button
                          type="button"
                          onClick={() => onPrintSalarySlip(slip)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Bagikan atau Kirim Slip Gaji via WhatsApp, PDF, dll."
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Kirim WA / Share</span>
                        </button>

                        {/* Print Button */}
                        <button
                          type="button"
                          onClick={() => onPrintSalarySlip(slip)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Cetak ulang slip A4/Thermal"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Yakin ingin menghapus slip gaji ${slip.slipNumber} (${slip.employeeName})? Catatan potongan kasbon terkait (jika ada) akan otomatis dikembalikan ke saldo kasbon karyawan.`)) {
                              onDeleteSalarySlip(slip.id);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          title="Hapus slip gaji ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSalarySlips.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada riwayat slip gaji yang sesuai dengan filter.
                </div>
              )}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-white/40 text-slate-700">
                    <th className="py-2.5 px-3">No. Slip</th>
                    <th className="py-2.5 px-3">Karyawan & Posisi</th>
                    <th className="py-2.5 px-3">Periode Gaji</th>
                    <th className="py-2.5 px-3 text-center">Hadir</th>
                    <th className="py-2.5 px-3 text-right">Upah Pokok</th>
                    <th className="py-2.5 px-3 text-right">Lembur</th>
                    <th className="py-2.5 px-3 text-right">Potongan</th>
                    <th className="py-2.5 px-3 text-right">Total Bersih</th>
                    <th className="py-2.5 px-3 text-center">Aksi (Cetak / WA / Hapus)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalarySlips.map((slip) => {
                    const emp = employees.find(e => e.id === slip.employeeId);

                    return (
                      <tr key={slip.id} className="hover:bg-white/60">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{slip.slipNumber}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{slip.employeeName}</span>
                          <span className="text-[10px] text-slate-500">{slip.employeeRole} • WA: {emp?.phone || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {formatDate(slip.periodStart)} s/d {formatDate(slip.periodEnd)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">{slip.daysPresent} Hari</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">{formatCurrency(slip.totalDailyWage)}</td>
                        <td className="py-2.5 px-3 text-right">
                          {slip.totalOvertimePay > 0 ? (
                            <div>
                              <span className="font-mono tabular-nums text-blue-700 font-bold block">+{formatCurrency(slip.totalOvertimePay)}</span>
                              <span className="text-[10px] text-slate-500 font-mono font-medium block">
                                ({slip.totalOvertimeHours ? `${slip.totalOvertimeHours} Jam` : `${slip.daysOvertime} Hari`})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">0 Jam</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 font-semibold">
                          {slip.deduction > 0 ? `-${formatCurrency(slip.deduction)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                          {formatCurrency(slip.netSalary)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onPrintSalarySlip(slip)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer shadow-2xs"
                              title="Bagikan atau Kirim Slip Gaji via WhatsApp, PDF, dll."
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Kirim WA / Share</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onPrintSalarySlip(slip)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-100/90 hover:bg-amber-200 rounded-md transition-colors cursor-pointer"
                              title="Cetak Ulang Dokumen Slip Gaji"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Yakin ingin menghapus slip gaji ${slip.slipNumber} (${slip.employeeName})? Catatan potongan kasbon terkait (jika ada) akan otomatis dikembalikan ke saldo kasbon karyawan.`)) {
                                  onDeleteSalarySlip(slip.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
                              title="Hapus Dokumen Slip Gaji"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSalarySlips.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Tidak ada riwayat slip gaji yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KASBON & PINJAMAN KARYAWAN */}
      {activeTab === 'kasbon' && (
        <div className="space-y-4">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Sisa Kasbon Aktif:</span>
              <span className="font-mono font-bold text-rose-700 text-base sm:text-lg block">
                {formatCurrency(kasbonOverview.totalActiveDebt)}
              </span>
              <span className="text-[10px] text-slate-500 block">Belum terlunasi</span>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Karyawan Memiliki Kasbon:</span>
              <span className="font-mono font-bold text-amber-800 text-base sm:text-lg block">
                {kasbonOverview.empCount} Orang
              </span>
              <span className="text-[10px] text-slate-500 block">Dari total {employees.length} karyawan</span>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Riwayat Pinjaman:</span>
              <span className="font-mono font-bold text-slate-800 text-base sm:text-lg block">
                {formatCurrency(kasbonOverview.totalBorrowedAll)}
              </span>
              <span className="text-[10px] text-slate-500 block">Akumulasi seluruh pinjaman</span>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Kasbon Dilunasi:</span>
              <span className="font-mono font-bold text-emerald-700 text-base sm:text-lg block">
                {formatCurrency(kasbonOverview.totalRepaidAll)}
              </span>
              <span className="text-[10px] text-slate-500 block">Via slip gaji & tunai manual</span>
            </div>
          </div>

          {/* TOOLBAR & ACTIONS */}
          <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-xl border border-white/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kasbon karyawan / keterangan..."
                  value={kasbonSearchQuery}
                  onChange={(e) => setKasbonSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white/90 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={kasbonFilterEmpId}
                  onChange={(e) => setKasbonFilterEmpId(e.target.value)}
                  className="p-1.5 bg-white/90 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="ALL">Semua Karyawan</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({formatCurrency(getEmployeeOutstandingKasbon(e.id))})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleOpenManualRepay()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer text-xs"
              >
                <CreditCard className="w-4 h-4" />
                <span>+ Pelunasan Manual</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddKasbon()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Kasbon Baru</span>
              </button>
            </div>
          </div>

          {/* PER-EMPLOYEE SUMMARY CARDS */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-md p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-600" />
              <span>Saldo Kasbon per Karyawan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {employees.map(emp => {
                const balance = getEmployeeOutstandingKasbon(emp.id);
                return (
                  <div key={emp.id} className="p-3 bg-white/80 rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{emp.name}</span>
                          <span className="text-[10px] text-slate-500">{emp.role} • {emp.code}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          balance > 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {balance > 0 ? 'Ada Kasbon' : 'Lunas'}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-baseline">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Sisa Kasbon:</span>
                        <span className={`font-mono font-bold text-sm ${balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenAddKasbon(emp.id)}
                        className="flex-1 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg cursor-pointer transition-colors"
                      >
                        + Pinjam
                      </button>
                      {balance > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenManualRepay(emp.id)}
                          className="flex-1 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg cursor-pointer transition-colors"
                        >
                          Bayar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LEDGER TABEL RIWAYAT TRANSAKSI KASBON */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-md overflow-hidden">
            <div className="p-3.5 border-b border-slate-200/80 bg-white/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <WalletCards className="w-4 h-4 text-amber-600" />
                  <span>Buku Riwayat & Mutasi Kasbon Karyawan</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Semua transaksi peminjaman baru, pelunasan manual, dan potongan slip gaji tercatat di sini secara otomatis.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                {filteredKasbonRecords.length} Catatan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-white/40 text-slate-700">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Karyawan</th>
                    <th className="py-2.5 px-3">Jenis Transaksi</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-right">Sisa Saldo</th>
                    <th className="py-2.5 px-3">Keterangan / Referensi</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKasbonRecords.map((rec) => {
                    const emp = employees.find(e => e.id === rec.employeeId);
                    return (
                      <tr key={rec.id} className="hover:bg-white/60">
                        <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                          {formatDate(rec.date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{rec.employeeName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{emp?.role || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.type === 'pinjam' 
                              ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                              : rec.type === 'bayar_slip'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}>
                            {rec.type === 'pinjam' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {rec.type === 'pinjam' ? 'Pinjaman Baru' : rec.type === 'bayar_slip' ? 'Potongan Slip Gaji' : 'Pelunasan Manual'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                          rec.type === 'pinjam' ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          {rec.type === 'pinjam' ? `+${formatCurrency(rec.amount)}` : `-${formatCurrency(rec.amount)}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatCurrency(rec.remainingBalanceAfter)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {rec.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {rec.type !== 'bayar_slip' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Yakin ingin menghapus catatan transaksi kasbon ${formatCurrency(rec.amount)} untuk ${rec.employeeName}?`)) {
                                  onDeleteKasbon(rec.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer transition-colors"
                              title="Hapus Catatan Kasbon Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Otomatis Slip</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredKasbonRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                        Belum ada catatan transaksi kasbon yang sesuai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: MASTER DATA KARYAWAN */}
      {activeTab === 'karyawan' && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 bg-white/50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daftar Tenaga Kerja, No. WhatsApp & Standar Upah
              </h3>
              <p className="text-xs text-slate-600">
                Data nomor WhatsApp di sini digunakan untuk pengiriman slip gaji elektronik
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddEmployee}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Karyawan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
            {employees.map((emp) => (
              <div key={emp.id} className="p-3.5 rounded-xl border border-white/80 bg-white/80 backdrop-blur-xs space-y-2 shadow-2xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">{emp.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{emp.code}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      emp.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {emp.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Posisi:</span>
                      <span className="font-semibold text-slate-800">{emp.role}</span>
                    </div>
                    {emp.status === 'Non-Aktif' && emp.deactivatedAt && (
                      <div className="flex justify-between text-rose-700 bg-rose-50 px-2 py-1 rounded text-[11px] font-semibold border border-rose-200">
                        <span>Tgl Non-Aktif:</span>
                        <span>{formatDate(emp.deactivatedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="text-slate-500">No. WhatsApp:</span>
                      <span className="font-mono font-bold flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {emp.phone || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Upah Harian:</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(emp.dailyWage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tarif Lembur:</span>
                      <span className="font-mono font-bold text-blue-700">{formatCurrency(emp.standardOvertimeRate)}/jam</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Pembaruan Upah</span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditEmployee(emp)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                    title="Ubah gaji harian, tarif lembur, nomor WA, atau status karyawan"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Ubah Data / Gaji</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WHATSAPP MODAL POPUP */}
      {waModalSlip && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 text-xs">
            <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Kirim Slip Gaji via WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setWaModalSlip(null)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Karyawan:</span>
                  <span className="font-bold text-slate-800">{waModalSlip.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Slip:</span>
                  <span className="font-mono font-semibold text-slate-800">{waModalSlip.slipNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periode:</span>
                  <span className="text-slate-800">{formatDate(waModalSlip.periodStart)} s/d {formatDate(waModalSlip.periodEnd)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-200 font-bold">
                  <span className="text-emerald-900">Total THP Bersih:</span>
                  <span className="font-mono text-emerald-800 text-sm">{formatCurrency(waModalSlip.netSalary)}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor WhatsApp Penerima:</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={waTargetPhone}
                    onChange={(e) => setWaTargetPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Nomor diambil dari data master karyawan. Bisa disesuaikan jika ingin kirim ke nomor lain.
                </span>
              </div>

              {/* PDF & WA Instructions */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Pengiriman Slip Gaji Direct:</span>
                <p>Format rincian slip gaji langsung dikirim tanpa kalimat obrolan/chat tambahan. Untuk melampirkan file PDF resmi, gunakan tombol <strong>"Cetak / Unduh PDF Slip"</strong>.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    onPrintSalarySlip(waModalSlip);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Cetak / Unduh PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchWhatsApp(waModalSlip, waTargetPhone)}
                  className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Buka WhatsApp & Kirim</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingEmployeeId ? <Edit3 className="w-4 h-4 text-amber-200" /> : <Plus className="w-4 h-4 text-amber-200" />}
                <h3 className="font-bold text-sm">
                  {editingEmployeeId ? 'Ubah Data & Upah Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Karyawan:</label>
                <input
                  type="text"
                  required
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Karyawan:</label>
                  <input
                    type="text"
                    value={newEmpCode}
                    onChange={(e) => setNewEmpCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 block text-xs sm:text-sm">Bagian / Peran:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleError(null);
                        setNewRoleInput('');
                        setShowRoleModal(true);
                      }}
                      className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Registrasi Peran
                    </button>
                  </div>
                  <select
                    value={newEmpRole}
                    onChange={(e) => {
                      if (e.target.value === '__NEW_ROLE__') {
                        setRoleError(null);
                        setNewRoleInput('');
                        setShowRoleModal(true);
                      } else {
                        setNewEmpRole(e.target.value);
                      }
                    }}
                    className={`w-full p-2 bg-slate-50 border rounded-lg font-medium text-xs sm:text-sm ${
                      !newEmpRole ? 'border-amber-400 text-slate-400 font-normal' : 'border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="" disabled>-- Pilih Bagian / Peran --</option>
                    {customRoles.map((role) => (
                      <option key={role} value={role} className="text-slate-800">
                        {role}
                      </option>
                    ))}
                    <option value="__NEW_ROLE__" className="text-amber-600 font-bold bg-amber-50">
                      + Daftarkan Bagian / Peran Baru...
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / HP:</label>
                  <input
                    type="text"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    placeholder="0812-..."
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Karyawan:</label>
                  <select
                    value={newEmpStatus}
                    onChange={(e) => setNewEmpStatus(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="Aktif">Aktif Bekerja</option>
                    <option value="Non-Aktif">Nonaktif / Berhenti</option>
                  </select>
                </div>
              </div>

              {newEmpStatus === 'Non-Aktif' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 animate-in fade-in duration-150">
                  <label className="font-bold text-rose-800 block text-xs">Tanggal Non-Aktif / Berhenti:</label>
                  <input
                    type="date"
                    value={newEmpDeactivatedAt}
                    onChange={(e) => setNewEmpDeactivatedAt(e.target.value)}
                    className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-rose-700 leading-tight">
                    Pertanggal ini ke depan, nama karyawan tidak muncul di daftar absensi. Sebelum tanggal ini, absensi & penerimaan gaji tetap dapat dilakukan.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Upah Harian Pokok (Rp):</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newEmpDailyWage === 0 ? '' : newEmpDailyWage.toLocaleString('id-ID')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setNewEmpDailyWage(raw === '' ? 0 : parseInt(raw, 10));
                      }}
                      className="w-full pl-8 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Berlaku untuk absensi harian</span>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tarif Lembur (Rp/jam):</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newEmpOvertimeRate === 0 ? '' : newEmpOvertimeRate.toLocaleString('id-ID')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setNewEmpOvertimeRate(raw === '' ? 0 : parseInt(raw, 10));
                      }}
                      className="w-full pl-8 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Dikalikan jam lembur</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingEmployeeId ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRASI BAGIAN / PERAN BARU SECARA LANGSUNG */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <Plus className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">Registrasi Bagian / Peran Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCustomRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Bagian / Peran Baru:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newRoleInput}
                  onChange={(e) => {
                    setNewRoleInput(e.target.value);
                    if (roleError) setRoleError(null);
                  }}
                  placeholder="Contoh: Packing, QC, Gudang Beku..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                />
                {roleError && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{roleError}</p>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Peran yang baru didaftarkan akan otomatis muncul dalam daftar pilihan karyawan.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-3.5 py-1.5 text-xs border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Simpan & Pilih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATAT KASBON PINJAMAN BARU */}
      {isAddKasbonModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <Plus className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">Catat Pinjaman Kasbon Karyawan</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddKasbonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAddKasbon} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Karyawan:</label>
                <select
                  value={addKasbonEmpId}
                  onChange={(e) => setAddKasbonEmpId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - Sisa Kasbon: {formatCurrency(getEmployeeOutstandingKasbon(emp.id))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Pinjam:</label>
                <input
                  type="date"
                  value={addKasbonDate}
                  onChange={(e) => setAddKasbonDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal Kasbon (Rp):</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addKasbonAmount === 0 ? '' : addKasbonAmount.toLocaleString('id-ID')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setAddKasbonAmount(raw === '' ? 0 : parseInt(raw, 10));
                    }}
                    placeholder="0"
                    className="w-full pl-8 p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  {[50000, 100000, 200000, 500000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAddKasbonAmount(amt)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono font-semibold cursor-pointer"
                    >
                      +{formatNumber(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan / Keperluan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Keperluan darurat keluarga, beli obat..."
                  value={addKasbonNotes}
                  onChange={(e) => setAddKasbonNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddKasbonModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Pinjaman Kasbon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PELUNASAN KASBON MANUAL (SETOR TUNAI) */}
      {isManualRepayModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-emerald-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">Pelunasan Kasbon Manual (Setor Tunai)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualRepayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManualRepay} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Karyawan:</label>
                <select
                  value={manualRepayEmpId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    setManualRepayEmpId(empId);
                    const bal = getEmployeeOutstandingKasbon(empId);
                    setManualRepayAmount(bal);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                >
                  {employees.map(emp => {
                    const bal = getEmployeeOutstandingKasbon(emp.id);
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role}) - Sisa Kasbon: {formatCurrency(bal)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs flex justify-between items-center">
                <span className="text-slate-700 font-medium">Sisa Kasbon Saat Ini:</span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatCurrency(getEmployeeOutstandingKasbon(manualRepayEmpId))}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Pelunasan:</label>
                <input
                  type="date"
                  value={manualRepayDate}
                  onChange={(e) => setManualRepayDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal Pembayaran (Rp):</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={manualRepayAmount === 0 ? '' : manualRepayAmount.toLocaleString('id-ID')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const val = raw === '' ? 0 : parseInt(raw, 10);
                      const currentBal = getEmployeeOutstandingKasbon(manualRepayEmpId);
                      setManualRepayAmount(Math.min(val, currentBal));
                    }}
                    placeholder="0"
                    className="w-full pl-8 p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-sm text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setManualRepayAmount(getEmployeeOutstandingKasbon(manualRepayEmpId))}
                    className="px-2.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-semibold cursor-pointer"
                  >
                    Lunaskan Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualRepayAmount(Math.round(getEmployeeOutstandingKasbon(manualRepayEmpId) / 2))}
                    className="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                  >
                    Bayar 50%
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Titip uang tunai ke kasir / transfer..."
                  value={manualRepayNotes}
                  onChange={(e) => setManualRepayNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsManualRepayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Pelunasan Kasbon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
