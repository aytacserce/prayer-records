import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";

type PrayerModalProps = {
  visible: boolean;
  onSelect: (type: "ontime" | "makeup") => void;
  onClose: () => void;
};

const PrayerModal: React.FC<PrayerModalProps> = ({ visible, onSelect, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Select prayer type</Text>
          <Pressable
            style={styles.button}
            onPress={() => onSelect("ontime")}
          >
            <Text style={styles.text}>On Time</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => onSelect("makeup")}
          >
            <Text style={styles.text}>Makeup</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: 280,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 6,
    width: "100%",
    alignItems: "center",
  },
  text: {
    color: "white",
    fontWeight: "bold",
  },
  closeText: {
    color: "red",
    marginTop: 10,
    fontWeight: "bold",
  },
});

export default PrayerModal;
