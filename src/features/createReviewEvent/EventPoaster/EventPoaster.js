import React, { useEffect, useRef, useState } from "react";
import "./EventPoaster.css";

/**
 * 포스터 업로더 (작은 플로팅 미리보기)
 * - 즉시 화면 노출 X
 * - "미리보기" 버튼 클릭 시 우하단 작은 창으로 표시
 *
 * Props:
 *  - onChange?: (file: File | null) => void
 *  - maxSizeMB?: number (기본 5MB)
 */
export default function EventPoaster({ onChange, maxSizeMB = 5 }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState("");
  const [open, setOpen] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // 이미지 타입/크기 간단 검증
    if (!f.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      onChange?.(null);
      return;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (f.size > maxBytes) {
      alert(`이미지 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      onChange?.(null);
      return;
    }

    setFile(f);
    onChange?.(f);
  };

  // Blob URL 생성/해제
  useEffect(() => {
    if (!file) {
      setPreviewURL("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewURL(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ESC로 미리보기 창 닫기
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const clearFile = () => {
    setFile(null);
    setPreviewURL("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange?.(null);
  };

  return (
    <div className="poster-upload">
      {/* 업로드 버튼 */}
      <label className="btn poster-btn" title="이벤트 포스터 업로드">
        포스터 업로드
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </label>

      {/* 미리보기 / 초기화 */}
      <button
        type="button"
        className="btn poster-btn"
        onClick={() => setOpen(true)}
        disabled={!file}
        title={file ? "미리보기" : "이미지를 먼저 선택하세요"}
      >
        미리보기
      </button>
      <button
        type="button"
        className="btn poster-btn"
        onClick={clearFile}
        disabled={!file}
        title={file ? "선택한 이미지 제거" : "제거할 이미지가 없습니다"}
      >
        제거
      </button>

      {/* 선택된 파일명(텍스트만) */}
      {file && (
        <div className="poster-filename" title={file.name}>
          {file.name}
        </div>
      )}

      {/* 🔹 우하단 작은 미리보기 패널 (오버레이 없음) */}
      {open && (
        <div
          className="poster-float"
          role="dialog"
          aria-modal="false"
          aria-label="포스터 미리보기"
        >
          <div className="poster-float-header">
            <strong>포스터 미리보기</strong>
            <button
              type="button"
              className="poster-close"
              onClick={() => setOpen(false)}
              aria-label="닫기"
            />
          </div>
          <div className="poster-float-body">
            {previewURL ? (
              <img
                src={previewURL}
                alt="이벤트 포스터 미리보기"
                className="poster-preview-img"
              />
            ) : (
              <p>선택된 이미지가 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
