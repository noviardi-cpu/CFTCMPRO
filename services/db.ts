
import { UserAccount, SavedPatient } from '../types';
import { supabase } from './supabase';

export const db = {
  users: {
    // Kept for compatibility if needed, but authService now uses Supabase directly
    getAll: (): UserAccount[] => {
      return [];
    },
    get: (uid: string): UserAccount | null => {
      return null;
    },
    add: (user: UserAccount): void => {
    },
    delete: (uid: string): void => {
    }
  },
  patients: {
    getAll: async (authorUid: string): Promise<SavedPatient[]> => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('author_uid', authorUid);
        
      if (error) {
        console.error('Error fetching patients:', error);
        return [];
      }
      
      return data.map(p => ({
        id: p.id,
        authorUid: p.author_uid,
        patientName: p.patient_name,
        age: p.age,
        sex: p.sex,
        phone: p.phone,
        email: p.email,
        address: p.address,
        complaint: p.complaint,
        symptoms: p.symptoms,
        selectedSymptoms: p.selected_symptoms,
        tongue: p.tongue,
        pulse: p.pulse,
        diagnosis: p.diagnosis,
        timestamp: p.timestamp,
        medicalHistory: p.medical_history,
        biomedicalDiagnosis: p.biomedical_diagnosis,
        icd10: p.icd10,
        medications: p.medications,
        followUpDate: p.follow_up_date,
        notes: p.notes
      }));
    },
    add: async (patient: SavedPatient): Promise<void> => {
      const { error } = await supabase
        .from('patients')
        .upsert({
          id: patient.id,
          author_uid: patient.authorUid,
          patient_name: patient.patientName,
          age: patient.age,
          sex: patient.sex,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
          complaint: patient.complaint,
          symptoms: patient.symptoms,
          selected_symptoms: patient.selectedSymptoms,
          tongue: patient.tongue,
          pulse: patient.pulse,
          diagnosis: patient.diagnosis,
          timestamp: patient.timestamp,
          medical_history: patient.medicalHistory,
          biomedical_diagnosis: patient.biomedicalDiagnosis,
          icd10: patient.icd10,
          medications: patient.medications,
          follow_up_date: patient.followUpDate,
          notes: patient.notes
        });
        
      if (error) {
        console.error("Failed to save patient", error);
      }
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Failed to delete patient", error);
      }
    }
  }
};
