export const loginInputFields = [
  {
    label: "이메일 또는 아이디",
    name: "id",
    placeholder: "이메일 또는 아이디",
    type: "text",
  },
  {
    label: "비밀번호",
    name: "password",
    placeholder: "비밀번호",
    type: "password",
  },
];

export const signupStep1Fields = [
  {
    label: "이메일",
    name: "email",
    placeholder: "example@mail.com",
    type: "email",
    rightButton: "send",
  },
  {
    label: "인증 코드",
    name: "code",
    placeholder: "XXXXXX",
    type: "text",
    rightButton: "verify",
  },
];

export const signupStep2Fields = [
  {
    label: "비밀번호",
    name: "password",
    placeholder: "비밀번호를 입력하세요",
    type: "password",
  },
  {
    label: "비밀번호 확인",
    name: "passwordConfirm",
    placeholder: "비밀번호를 다시 입력하세요",
    type: "password",
  },
];
