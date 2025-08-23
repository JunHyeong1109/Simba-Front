import React, { useEffect, useRef, useState } from "react";
import "./EventPoaster.css";

/**
 * 포스터 업로더 (파일 + 이미지 URL 지원, 작은 플로팅 미리보기)
 *
 * Props:
 *  - onChange?: (payload: { file: File|null, url: string }) => void
 *  - maxSizeMB?: number (기본 5MB)
 *
 * 사용 우선순위:
 *  1) file 이 있으면 file 사용
 *  2) file 없고 url 있으면 url 사용
 */
export default function EventPoaster({ onChange, maxSizeMB = 5 }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [filePreviewURL, setFilePreviewURL] = useState("");

  const [imgUrl, setImgUrl] = useState("");
  const [open, setOpen] = useState(false);

  // 파일 선택
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // 이미지 타입/크기 검증
    if (!f.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      clearFile(true);
      return;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (f.size > maxBytes) {
      alert(`이미지 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
      clearFile(true);
      return;
    }

    setFile(f);
    // 파일이 들어오면 URL 입력은 보조로만 사용되므로 그대로 두되,
    // 상위로는 파일을 우선 전달
    onChange?.({ file: f, url: "" });
  };

  // 파일 미리보기 URL 관리
  useEffect(() => {
    if (!file) {
      setFilePreviewURL("");
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewURL(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ESC로 미리보기 창 닫기
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const clearFile = (focusInput = false) => {
    setFile(null);
    setFilePreviewURL("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      if (focusInput) fileInputRef.current.focus();
    }
    // 파일을 제거하면 URL이 있으면 URL을 상위에 전달, 없으면 모두 해제
    onChange?.({ file: null, url: imgUrl.trim() });
  };

  // URL 입력 변경
  const handleUrlChange = (e) => {
    const next = e.target.value;
    setImgUrl(next);
  };

  // URL 적용 (검증 + 상위 전달)
  const applyUrl = () => {
    const trimmed = imgUrl.trim();
    if (!trimmed) {
      // 빈 값 적용이면 전체 해제
      onChange?.({ file: file ?? null, url: "" });
      return;
    }
    // 간단한 URL 형식 검증
    try {
      const u = new URL(trimmed);
      // 이미지 확장자 대략 검증 (선택)
      const okExt = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(u.pathname);
      if (!okExt) {
        // 확장자가 없어도 CDN 등은 가능하니 경고만
        // eslint-disable-next-line no-console
        console.info("이미지 확장자 확인 불가. 그대로 적용합니다.");
      }
      // 파일이 없을 때만 URL이 실사용됨. 상위엔 항상 최신 상태 전달
      onChange?.({ file: file ?? null, url: trimmed });
    } catch (err) {
      alert("유효한 이미지 URL을 입력해주세요.");
    }
  };

  // 현재 미리보기 대상 결정
  const previewSrc = file ? filePreviewURL : (imgUrl.trim() || "");

  return (
    <div className="poster-upload">
      {/* 파일 업로드 */}
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

      {/* URL 입력 */}
      <div className="poster-url-row">
        <input
          type="url"
          className="poster-url-input"
          placeholder="이미지 URL 입력 (https://...)"
          value={imgUrl}
          onChange={handleUrlChange}
          onBlur={applyUrl} // 입력 후 포커스 아웃 시 적용
        />
        <button
          type="button"
          className="btn poster-btn"
          onClick={applyUrl}
          title="URL 적용"
        >
          적용
        </button>
      </div>

      {/* 미리보기 / 초기화 */}
      <div className="poster-actions">
        <button
          type="button"
          className="btn poster-btn"
          onClick={() => setOpen(true)}
          disabled={!previewSrc}
          title={previewSrc ? "미리보기" : "이미지를 먼저 선택하거나 URL을 입력하세요"}
        >
          미리보기
        </button>
        <button
          type="button"
          className="btn poster-btn"
          onClick={() => {
            // 파일/URL 전부 초기화
            clearFile();
            setImgUrl("");
            onChange?.({ file: null, url: "" });
          }}
          disabled={!file && !imgUrl.trim()}
          title={file || imgUrl.trim() ? "선택/입력한 이미지 제거" : "제거할 이미지가 없습니다"}
        >
          제거
        </button>
      </div>

      {/* 선택된 파일명(텍스트만) */}
      {file && (
        <div className="poster-filename" title={file.name}>
          {file.name}
        </div>
      )}

      {/* 우하단 작은 미리보기 패널 (오버레이 없음) */}
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
            {previewSrc ? (
              // 파일이 있으면 Blob URL, 없으면 imgUrl로 표시
              <img
                src={previewSrc}
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
