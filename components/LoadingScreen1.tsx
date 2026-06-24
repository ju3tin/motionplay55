"use client";

type Props = {
  status: string;
};

export default function LoadingScreen({ status }: Props) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.box}>
        <div style={styles.spinner} />
        <h2>Starting App</h2>
        <p>{status}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    color: "white",
  },
  box: {
    textAlign: "center",
  },
  spinner: {
    width: 50,
    height: 50,
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },
};
